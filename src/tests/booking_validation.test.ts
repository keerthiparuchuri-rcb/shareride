import { describe, it, expect } from 'vitest';

interface ValidateBookingParams {
  userId: string;
  driverId: string;
  departureTime: string;
  requestedSeats: number;
  availableSeats: number;
  totalSeats: number;
  rideStatus: string;
  hasExistingActiveBooking: boolean;
}

export function validateBookingRequest(params: ValidateBookingParams): { valid: boolean; error?: string } {
  if (!params.userId) {
    return { valid: false, error: 'Authentication required' };
  }

  if (params.userId === params.driverId) {
    return { valid: false, error: 'Cannot book your own ride' };
  }

  if (params.rideStatus !== 'scheduled') {
    return { valid: false, error: `Ride is no longer open for booking (status: ${params.rideStatus})` };
  }

  const depTime = new Date(params.departureTime).getTime();
  if (depTime <= Date.now()) {
    return { valid: false, error: 'Cannot book past rides' };
  }

  if (params.requestedSeats <= 0) {
    return { valid: false, error: 'Seats must be at least 1' };
  }

  if (params.requestedSeats > params.availableSeats) {
    return {
      valid: false,
      error: `Not enough seats available. Only ${params.availableSeats} seat(s) remaining`,
    };
  }

  if (params.hasExistingActiveBooking) {
    return { valid: false, error: 'You already have an active booking request for this ride' };
  }

  return { valid: true };
}

export function calculateSeatsAfterCancellation(
  currentAvailable: number,
  totalSeats: number,
  seatsBooked: number,
  bookingStatus: 'pending' | 'accepted'
): number {
  // If the booking was pending, seats were not yet decremented from available_seats
  if (bookingStatus === 'pending') {
    return currentAvailable;
  }
  // If the booking was accepted, seats are returned, capped at totalSeats
  return Math.min(totalSeats, currentAvailable + seatsBooked);
}

describe('Booking Integrity & Concurrency Rules', () => {
  const futureDeparture = new Date(Date.now() + 86400000).toISOString(); // +24 hours
  const pastDeparture = new Date(Date.now() - 3600000).toISOString();    // -1 hour

  it('rejects booking when passenger attempts to book their own ride', () => {
    const result = validateBookingRequest({
      userId: 'user-123',
      driverId: 'user-123',
      departureTime: futureDeparture,
      requestedSeats: 1,
      availableSeats: 3,
      totalSeats: 4,
      rideStatus: 'scheduled',
      hasExistingActiveBooking: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Cannot book your own ride');
  });

  it('rejects booking when requested seats exceed available capacity', () => {
    const result = validateBookingRequest({
      userId: 'passenger-456',
      driverId: 'driver-123',
      departureTime: futureDeparture,
      requestedSeats: 3,
      availableSeats: 2,
      totalSeats: 4,
      rideStatus: 'scheduled',
      hasExistingActiveBooking: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Not enough seats available');
  });

  it('rejects booking when departure time is in the past', () => {
    const result = validateBookingRequest({
      userId: 'passenger-456',
      driverId: 'driver-123',
      departureTime: pastDeparture,
      requestedSeats: 1,
      availableSeats: 3,
      totalSeats: 4,
      rideStatus: 'scheduled',
      hasExistingActiveBooking: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Cannot book past rides');
  });

  it('rejects duplicate active booking by the same passenger', () => {
    const result = validateBookingRequest({
      userId: 'passenger-456',
      driverId: 'driver-123',
      departureTime: futureDeparture,
      requestedSeats: 1,
      availableSeats: 3,
      totalSeats: 4,
      rideStatus: 'scheduled',
      hasExistingActiveBooking: true,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('already have an active booking');
  });

  it('approves valid booking request within seat and time limits', () => {
    const result = validateBookingRequest({
      userId: 'passenger-456',
      driverId: 'driver-123',
      departureTime: futureDeparture,
      requestedSeats: 2,
      availableSeats: 3,
      totalSeats: 4,
      rideStatus: 'scheduled',
      hasExistingActiveBooking: false,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('properly restores seat capacity upon cancellation of accepted bookings without exceeding total capacity', () => {
    // 1 seat remaining out of 4, passenger cancels their 2-seat accepted booking -> 3 seats
    const restored = calculateSeatsAfterCancellation(1, 4, 2, 'accepted');
    expect(restored).toBe(3);

    // If cancelled while pending, available seats must remain unchanged
    const pendingRestored = calculateSeatsAfterCancellation(1, 4, 2, 'pending');
    expect(pendingRestored).toBe(1);

    // Does not exceed totalSeats even if corrupted
    const capped = calculateSeatsAfterCancellation(3, 4, 2, 'accepted');
    expect(capped).toBe(4);
  });
});
