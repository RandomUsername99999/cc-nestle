-- =====================================================
-- PROTOTYPE DATA / MOCK DATA FOR TRACKING DATABASE
-- =====================================================
USE traking;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS (passwords are hashed - here using simple dummy hashes for prototype)
-- Roles: 1=Admin, 2=Manager, 3=Dispatcher, 4=Driver, 5=Customer
TRUNCATE TABLE users;
INSERT INTO users (user_id, username, email, password_hash, role_id, is_active) VALUES
(1, 'superadmin', 'admin@logistics.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 1, 1),
(2, 'manager_john', 'john@logistics.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 2, 1),
(3, 'dispatch_sarah', 'sarah@logistics.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 3, 1),
(4, 'driver_mike', 'mike@logistics.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 4, 1),
(5, 'driver_alex', 'alex@logistics.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 4, 1),
(6, 'cust_acme', 'contact@acmecorp.com', 'pbkdf2_sha256$1000000$dHe0kRKrdjijKrzRkS0yV8$srmZ12VF9uXZk3hMJ5FF5qIgDgtg5cakzPxT+UBzhIc=', 5, 1);

-- 2. EMPLOYEES
-- Employees for users 1 (Admin), 2 (Manager), 3 (Dispatcher), 4 (Driver), 5 (Driver)
TRUNCATE TABLE employees;
INSERT INTO employees (employee_id, user_id, full_name, national_id, contact_number, address, date_of_birth, hire_date, status) VALUES
(1, 1, 'System Administrator', 'ID-000000', '+18005550001', '100 Tech Blvd, NY', '1985-01-01', '2020-01-01', 'active'),
(2, 2, 'John Doe', 'ID-100200', '+18005550002', '200 Business Rd, NY', '1982-05-14', '2020-03-15', 'active'),
(3, 3, 'Sarah Connor', 'ID-100300', '+18005550003', '300 Supply Ave, NY', '1990-08-22', '2021-06-10', 'active'),
(4, 4, 'Mike Wheeler', 'ID-100400', '+18005550004', '400 Transit St, NY', '1993-11-30', '2022-01-20', 'active'),
(5, 5, 'Alex Vance', 'ID-100500', '+18005550005', '500 Highway Ln, NY', '1988-02-18', '2022-04-05', 'active');

-- 3. DRIVERS
-- Linking employee 4 and 5
TRUNCATE TABLE drivers;
INSERT INTO drivers (driver_id, employee_id, license_number, license_expiry_date, license_type, experience_years, status) VALUES
(1, 4, 'DL-NY-847293', '2028-11-30', 'heavy_vehicle', 5.5, 'available'),
(2, 5, 'DL-NY-394821', '2027-04-15', 'light_vehicle', 3.0, 'on_route');

-- 4. CUSTOMERS
-- Linking user 6
TRUNCATE TABLE customers;
INSERT INTO customers (customer_id, user_id, business_name, contact_person_name, email, phone_number, address, latitude, longitude, credit_limit, payment_terms, is_active) VALUES
(1, 6, 'Acme Corporation', 'Wile E. Coyote', 'contact@acmecorp.com', '+18009990001', 'Desert Valley Road, TX', 31.96860000, -99.90180000, 50000.00, 30, 1),
(2, NULL, 'Globex Inc', 'Hank Scorpio', 'hank@globex.com', '+18009990002', 'Cyprus Creek, OR', 44.92800000, -123.02320000, 100000.00, 45, 1);

-- 5. VEHICLES
TRUNCATE TABLE vehicles;
INSERT INTO vehicles (vehicle_id, plate_number, vehicle_type, manufacturer, model, year, capacity_kg, capacity_volume, fuel_type, status, insurance_expiry, registration_expiry) VALUES
(1, 'TRK-9821', 'truck', 'Volvo', 'FH16', 2021, 18000.00, 40.00, 'diesel', 'in_use', '2026-12-31', '2026-12-31'),
(2, 'VAN-4432', 'van', 'Mercedes', 'Sprinter', 2022, 3500.00, 14.00, 'diesel', 'available', '2026-10-15', '2026-10-15'),
(3, 'TRL-1122', 'trailer', 'Schmitz', 'Cargobull', 2020, 24000.00, 80.00, 'diesel', 'available', '2026-08-20', '2026-08-20');

-- 6. DRIVER-VEHICLE ASSIGNMENTS
TRUNCATE TABLE driver_vehicle_assignments;
INSERT INTO driver_vehicle_assignments (assignment_id, driver_id, vehicle_id, assignment_start_date, assignment_end_date, status, assigned_by) VALUES
(1, 2, 1, '2026-03-01 08:00:00', NULL, 'active', 3), 
(2, 1, 2, '2026-03-10 09:00:00', '2026-03-20 17:00:00', 'completed', 3);

-- 7. SHIPMENTS
TRUNCATE TABLE shipments;
INSERT INTO shipments (shipment_id, shipment_reference, customer_id, source_location_name, source_address, source_latitude, source_longitude, destination_address, destination_latitude, destination_longitude, driver_id, vehicle_id, assignment_id, status, priority, scheduled_pickup_date, scheduled_delivery_date, weight_kg, volume_m3, created_by) VALUES
(1, 'SHP-10001', 1, 'Central Warehouse', '100 Warehouse Row, NY', 40.71280000, -74.00600000, 'Desert Valley Road, TX', 31.96860000, -99.90180000, 2, 1, 1, 'in_transit', 'high', '2026-03-24 10:00:00', '2026-03-27 15:00:00', 4500.00, 12.50, 2),
(2, 'SHP-10002', 2, 'Port Authority', 'Terminal 4, NJ', 40.68950000, -74.17450000, 'Cyprus Creek, OR', 44.92800000, -123.02320000, NULL, NULL, NULL, 'pending', 'normal', '2026-03-28 08:00:00', '2026-04-02 12:00:00', 12000.00, 25.00, 2);

SET FOREIGN_KEY_CHECKS = 1;
