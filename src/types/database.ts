export type UserRole = 'rider' | 'driver' | 'admin';

export type RideStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export type NotificationType = 
  | 'booking_request' 
  | 'booking_accepted' 
  | 'booking_rejected' 
  | 'ride_cancelled' 
  | 'trip_reminder' 
  | 'safety_alert' 
  | 'system';

export type SafetyIssueType = 
  | 'reckless_driving' 
  | 'harassment' 
  | 'fraud' 
  | 'vehicle_mismatch' 
  | 'lateness_no_show' 
  | 'safety_concern' 
  | 'other';

export type SafetyReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  seats_capacity: number;
  created_at: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  price_per_seat: number;
  distance_km: number | null;
  duration_minutes: number | null;
  route_polyline: string | null;
  notes: string | null;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  driver?: Profile;
  vehicle?: Vehicle;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  status: BookingStatus;
  pickup_address: string | null;
  dropoff_address: string | null;
  total_price: number;
  created_at: string;
  updated_at: string;
  ride?: Ride;
  passenger?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  ride_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Profile;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  created_at: string;
}

export interface SafetyReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  ride_id: string | null;
  issue_type: SafetyIssueType;
  description: string;
  status: SafetyReportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
  reported_user?: Profile;
}
