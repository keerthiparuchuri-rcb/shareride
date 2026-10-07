-- Booking/verification enhancement migration for RouteMates.
-- Safe, additive migration that preserves the existing schema and adds the fields used by the booking verification flow.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'cancelled', 'completed')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS ride_status TEXT GENERATED ALWAYS AS (status) STORED;

CREATE OR REPLACE FUNCTION public.generate_booking_confirmation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'RM';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    code := code || substr(alphabet, floor(random() * length(alphabet)) + 1, 1);
  END LOOP;

  WHILE EXISTS (SELECT 1 FROM public.bookings WHERE confirmation_code = code) LOOP
    code := 'RM';
    FOR i IN 1..5 LOOP
      code := code || substr(alphabet, floor(random() * length(alphabet)) + 1, 1);
    END LOOP;
  END LOOP;

  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
    NEW.confirmation_code := public.generate_booking_confirmation_code();
  END IF;

  IF NEW.verification_status IS NULL THEN
    NEW.verification_status := 'unverified';
  END IF;

  IF NEW.status = 'completed' AND NEW.verification_status <> 'verified' THEN
    NEW.verification_status := 'completed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_confirmation_code_trigger ON public.bookings;
CREATE TRIGGER booking_confirmation_code_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_defaults();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmation_code
  ON public.bookings (confirmation_code)
  WHERE confirmation_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_verification_status
  ON public.bookings (verification_status);

CREATE INDEX IF NOT EXISTS idx_rides_ride_status
  ON public.rides (ride_status);

CREATE OR REPLACE FUNCTION public.verify_booking_code(
  p_booking_id UUID,
  p_confirmation_code TEXT,
  p_verified_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_ride public.rides%ROWTYPE;
BEGIN
  IF p_verified_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF v_ride.driver_id <> p_verified_by AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can verify this passenger';
  END IF;

  IF v_booking.status IN ('cancelled', 'rejected', 'completed') THEN
    RAISE EXCEPTION 'This booking cannot be verified in its current state';
  END IF;

  IF v_booking.verification_status = 'verified' THEN
    RAISE EXCEPTION 'This booking has already been verified';
  END IF;

  IF v_booking.confirmation_code IS NULL OR upper(v_booking.confirmation_code) <> upper(COALESCE(p_confirmation_code, '')) THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;

  UPDATE public.bookings
  SET verification_status = 'verified',
      verified_at = timezone('utc', now()),
      verified_by = p_verified_by,
      status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_booking.passenger_id,
    'Passenger Verified',
    'Your booking for the trip to ' || v_ride.destination_address || ' has been verified by the driver.',
    'system',
    jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_ride.id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_status', 'verified',
    'message', 'Passenger verified successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_ride(p_ride_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id <> p_driver_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can start this ride';
  END IF;

  IF v_ride.status = 'completed' THEN
    RAISE EXCEPTION 'Ride already completed';
  END IF;

  IF v_ride.status = 'cancelled' THEN
    RAISE EXCEPTION 'Ride has been cancelled';
  END IF;

  IF v_ride.status = 'in_progress' THEN
    RAISE EXCEPTION 'Ride is already in progress';
  END IF;

  UPDATE public.rides
  SET status = 'in_progress', updated_at = timezone('utc', now())
  WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true, 'status', 'in_progress', 'message', 'Ride started successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ride(p_ride_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id <> p_driver_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can complete this ride';
  END IF;

  IF v_ride.status = 'completed' THEN
    RAISE EXCEPTION 'Ride is already completed';
  END IF;

  IF v_ride.status = 'scheduled' THEN
    RAISE EXCEPTION 'Ride must be started before it can be completed';
  END IF;

  UPDATE public.rides
  SET status = 'completed', updated_at = timezone('utc', now())
  WHERE id = p_ride_id;

  UPDATE public.bookings
  SET status = 'completed', verification_status = COALESCE(verification_status, 'verified'), updated_at = timezone('utc', now())
  WHERE ride_id = p_ride_id AND status IN ('accepted', 'pending');

  INSERT INTO public.notifications (user_id, title, message, type, data)
  SELECT passenger_id, 'Ride Completed', 'Your trip to ' || v_ride.destination_address || ' has been marked complete.', 'system', jsonb_build_object('ride_id', p_ride_id)
  FROM public.bookings
  WHERE ride_id = p_ride_id AND status = 'completed';

  RETURN jsonb_build_object('success', true, 'status', 'completed', 'message', 'Ride completed successfully');
END;
$$;
