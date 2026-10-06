-- ============================================================================
-- RouteMates Database Schema, Row-Level Security (RLS) & Atomic RPC Functions
-- Fully idempotent and non-destructive. Preserves any existing tables and data.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'rider' CHECK (role IN ('rider', 'driver', 'admin')),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'rider')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Secure function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2. VEHICLES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM now()) + 1),
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  seats_capacity INTEGER NOT NULL CHECK (seats_capacity >= 1 AND seats_capacity <= 15),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 3. RIDES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  vehicle_id UUID,
  origin_address TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  total_seats INTEGER NOT NULL CHECK (total_seats >= 1),
  price_per_seat NUMERIC(10, 2) NOT NULL CHECK (price_per_seat >= 0),
  distance_km NUMERIC(10, 2),
  duration_minutes INTEGER,
  route_polyline TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT rides_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT rides_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_rides_updated_at ON public.rides;
CREATE TRIGGER set_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. BOOKINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1 CHECK (seats_booked >= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  pickup_address TEXT,
  dropoff_address TEXT,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT bookings_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE CASCADE,
  CONSTRAINT bookings_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Prevent duplicate active requests by the same passenger on the same ride
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_passenger_booking 
  ON public.bookings(ride_id, passenger_id) 
  WHERE status IN ('pending', 'accepted');

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('booking_request', 'booking_accepted', 'booking_rejected', 'ride_cancelled', 'trip_reminder', 'safety_alert', 'system')),
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. REVIEWS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reviews_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT unique_review_per_party UNIQUE (ride_id, reviewer_id, reviewee_id)
);

-- ----------------------------------------------------------------------------
-- 7. TRUSTED CONTACTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT trusted_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 8. SAFETY REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  ride_id UUID,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('reckless_driving', 'harassment', 'fraud', 'vehicle_mismatch', 'lateness_no_show', 'safety_concern', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT safety_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT safety_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT safety_reports_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_safety_reports_updated_at ON public.safety_reports;
CREATE TRIGGER set_safety_reports_updated_at
  BEFORE UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_departure ON public.rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_bookings_ride ON public.bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON public.bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON public.safety_reports(status);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are readable by anyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by anyone"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- VEHICLES POLICIES
DROP POLICY IF EXISTS "Vehicles viewable by anyone" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles are viewable by authenticated users" ON public.vehicles;
CREATE POLICY "Vehicles viewable by anyone"
  ON public.vehicles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Drivers can insert own vehicles" ON public.vehicles;
CREATE POLICY "Drivers can insert own vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update own vehicles" ON public.vehicles;
CREATE POLICY "Drivers can update own vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can delete own vehicles" ON public.vehicles;
CREATE POLICY "Drivers can delete own vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- RIDES POLICIES (Public read access so visitors can search rides)
DROP POLICY IF EXISTS "Rides viewable by anyone" ON public.rides;
DROP POLICY IF EXISTS "Rides viewable by authenticated users" ON public.rides;
CREATE POLICY "Rides viewable by anyone"
  ON public.rides FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Drivers can create rides" ON public.rides;
CREATE POLICY "Drivers can create rides"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update own rides" ON public.rides;
CREATE POLICY "Drivers can update own rides"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id OR public.is_admin())
  WITH CHECK (auth.uid() = driver_id OR public.is_admin());

DROP POLICY IF EXISTS "Drivers can delete own rides" ON public.rides;
CREATE POLICY "Drivers can delete own rides"
  ON public.rides FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id OR public.is_admin());

-- BOOKINGS POLICIES
DROP POLICY IF EXISTS "Bookings viewable by ride driver or booking passenger" ON public.bookings;
CREATE POLICY "Bookings viewable by ride driver or booking passenger"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id 
    OR auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = public.bookings.ride_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Passengers can create bookings" ON public.bookings;
CREATE POLICY "Passengers can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "Participants or admin can update bookings" ON public.bookings;
CREATE POLICY "Participants or admin can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = passenger_id 
    OR auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = public.bookings.ride_id)
    OR public.is_admin()
  );

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can only read own notifications" ON public.notifications;
CREATE POLICY "Users can only read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users or functions can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users or functions can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- REVIEWS POLICIES
DROP POLICY IF EXISTS "Reviews are readable by anyone" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are readable by authenticated users" ON public.reviews;
CREATE POLICY "Reviews are readable by anyone"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Reviewers can insert own reviews" ON public.reviews;
CREATE POLICY "Reviewers can insert own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- TRUSTED CONTACTS POLICIES
DROP POLICY IF EXISTS "Users can manage own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Users can manage own trusted contacts"
  ON public.trusted_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SAFETY REPORTS POLICIES
DROP POLICY IF EXISTS "Users can view own safety reports, admin can view all" ON public.safety_reports;
CREATE POLICY "Users can view own safety reports, admin can view all"
  ON public.safety_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can file safety reports" ON public.safety_reports;
CREATE POLICY "Users can file safety reports"
  ON public.safety_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can update safety reports" ON public.safety_reports;
CREATE POLICY "Admins can update safety reports"
  ON public.safety_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- SCHEMA PERMISSIONS
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- SECURE ATOMIC RPC FUNCTIONS (CONCURRENCY & SEAT INTEGRITY)
-- ----------------------------------------------------------------------------

-- 1. Atomic Booking Request
CREATE OR REPLACE FUNCTION public.request_booking(
  p_ride_id UUID,
  p_seats INTEGER,
  p_pickup TEXT,
  p_dropoff TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_caller_id UUID;
  v_existing_booking UUID;
  v_new_booking_id UUID;
  v_total_cost NUMERIC(10, 2);
  v_passenger_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_seats <= 0 THEN
    RAISE EXCEPTION 'Seats must be at least 1';
  END IF;

  -- Lock ride row for concurrency
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot book your own ride';
  END IF;

  IF v_ride.status != 'scheduled' THEN
    RAISE EXCEPTION 'Ride is no longer open for booking (status: %)', v_ride.status;
  END IF;

  IF v_ride.departure_time <= now() THEN
    RAISE EXCEPTION 'Cannot book past rides';
  END IF;

  IF v_ride.available_seats < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available. Only % seat(s) remaining', v_ride.available_seats;
  END IF;

  -- Check for existing active booking
  SELECT id INTO v_existing_booking
  FROM public.bookings
  WHERE ride_id = p_ride_id 
    AND passenger_id = v_caller_id 
    AND status IN ('pending', 'accepted')
  LIMIT 1;

  IF v_existing_booking IS NOT NULL THEN
    RAISE EXCEPTION 'You already have an active booking request for this ride';
  END IF;

  v_total_cost := v_ride.price_per_seat * p_seats;

  -- Insert booking
  INSERT INTO public.bookings (
    ride_id,
    passenger_id,
    seats_booked,
    status,
    pickup_address,
    dropoff_address,
    total_price
  ) VALUES (
    p_ride_id,
    v_caller_id,
    p_seats,
    'pending',
    COALESCE(p_pickup, v_ride.origin_address),
    COALESCE(p_dropoff, v_ride.destination_address),
    v_total_cost
  ) RETURNING id INTO v_new_booking_id;

  -- Get passenger name for notification
  SELECT full_name INTO v_passenger_name
  FROM public.profiles
  WHERE id = v_caller_id;

  -- Create driver notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_ride.driver_id,
    'New Booking Request',
    COALESCE(v_passenger_name, 'A passenger') || ' requested ' || p_seats || ' seat(s) on your ride to ' || v_ride.destination_address,
    'booking_request',
    jsonb_build_object('booking_id', v_new_booking_id, 'ride_id', p_ride_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'message', 'Booking request submitted successfully'
  );
END;
$$;

-- 2. Atomic Respond To Booking (Driver Decision)
CREATE OR REPLACE FUNCTION public.respond_to_booking(
  p_booking_id UUID,
  p_decision TEXT -- 'accepted' or 'rejected'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_ride public.rides%ROWTYPE;
  v_caller_id UUID;
  v_driver_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision. Must be accepted or rejected';
  END IF;

  -- Lock booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Booking is already %', v_booking.status;
  END IF;

  -- Lock associated ride row
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF v_ride.driver_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only the driver can accept or reject this request';
  END IF;

  SELECT full_name INTO v_driver_name
  FROM public.profiles
  WHERE id = v_ride.driver_id;

  IF p_decision = 'accepted' THEN
    -- Check seat capacity atomically
    IF v_ride.available_seats < v_booking.seats_booked THEN
      RAISE EXCEPTION 'Cannot accept: Only % seat(s) remaining, but request requires %', 
        v_ride.available_seats, v_booking.seats_booked;
    END IF;

    -- Decrement seats
    UPDATE public.rides
    SET available_seats = available_seats - v_booking.seats_booked
    WHERE id = v_ride.id;

    -- Update booking status
    UPDATE public.bookings
    SET status = 'accepted'
    WHERE id = p_booking_id;

    -- Notify passenger
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_booking.passenger_id,
      'Ride Request Accepted!',
      COALESCE(v_driver_name, 'Your driver') || ' accepted your request for the trip to ' || v_ride.destination_address,
      'booking_accepted',
      jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_ride.id)
    );
  ELSE
    -- Rejection
    UPDATE public.bookings
    SET status = 'rejected'
    WHERE id = p_booking_id;

    -- Notify passenger
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_booking.passenger_id,
      'Ride Request Declined',
      COALESCE(v_driver_name, 'The driver') || ' was unable to accept your request for the ride to ' || v_ride.destination_address,
      'booking_rejected',
      jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_ride.id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_decision,
    'message', 'Booking has been ' || p_decision
  );
END;
$$;

-- 3. Atomic Cancel Booking
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_ride public.rides%ROWTYPE;
  v_caller_id UUID;
  v_cancelled_by TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status IN ('cancelled', 'completed', 'rejected') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled because it is already %', v_booking.status;
  END IF;

  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF v_caller_id = v_booking.passenger_id THEN
    v_cancelled_by := 'passenger';
  ELSIF v_caller_id = v_ride.driver_id OR public.is_admin() THEN
    v_cancelled_by := 'driver';
  ELSE
    RAISE EXCEPTION 'Unauthorized to cancel this booking';
  END IF;

  -- If it was accepted, restore seats to ride
  IF v_booking.status = 'accepted' THEN
    UPDATE public.rides
    SET available_seats = LEAST(total_seats, available_seats + v_booking.seats_booked)
    WHERE id = v_ride.id;
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;

  -- Notify the other party
  IF v_cancelled_by = 'passenger' THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_ride.driver_id,
      'Passenger Cancelled Booking',
      'A passenger cancelled their booking for the ride to ' || v_ride.destination_address,
      'system',
      jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_ride.id)
    );
  ELSE
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_booking.passenger_id,
      'Booking Cancelled by Driver',
      'The driver cancelled your booking for the trip to ' || v_ride.destination_address,
      'ride_cancelled',
      jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_ride.id)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Booking cancelled successfully');
END;
$$;

-- 4. Atomic Cancel Ride (Driver)
CREATE OR REPLACE FUNCTION public.cancel_ride(
  p_ride_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_caller_id UUID;
  v_booking RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can cancel this ride';
  END IF;

  IF v_ride.status = 'cancelled' THEN
    RAISE EXCEPTION 'Ride is already cancelled';
  END IF;

  -- Mark ride cancelled
  UPDATE public.rides
  SET status = 'cancelled'
  WHERE id = p_ride_id;

  -- Cancel all active bookings and notify passengers
  FOR v_booking IN
    SELECT id, passenger_id
    FROM public.bookings
    WHERE ride_id = p_ride_id AND status IN ('pending', 'accepted')
  LOOP
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE id = v_booking.id;

    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      v_booking.passenger_id,
      'Ride Cancelled by Driver',
      'The driver has cancelled the scheduled trip to ' || v_ride.destination_address,
      'ride_cancelled',
      jsonb_build_object('ride_id', p_ride_id)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Ride and associated bookings cancelled successfully');
END;
$$;

-- ----------------------------------------------------------------------------
-- REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- ----------------------------------------------------------------------------
-- RELOAD POSTGREST SCHEMA CACHE
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
