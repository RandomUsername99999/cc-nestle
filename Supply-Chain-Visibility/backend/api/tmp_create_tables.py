import pymysql

try:
    db = pymysql.connect(host='127.0.0.1', user='root', db='traking')
    cursor = db.cursor()

    # Drop existing tables if they exist to start fresh
    cursor.execute('DROP TABLE IF EXISTS `vehicle_assignment_history`;')
    cursor.execute('DROP TABLE IF EXISTS `api_driverprofile`;')

    cursor.execute('''
    CREATE TABLE `api_driverprofile` (
        `id` bigint(20) NOT NULL AUTO_INCREMENT,
        `license_number` varchar(50) NOT NULL,
        `license_expiry_date` date NOT NULL,
        `address` longtext NOT NULL,
        `phone` varchar(20) NOT NULL,
        `user_id` int(11) NOT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `user_id` (`user_id`),
        CONSTRAINT `api_driverprofile_user_id_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ''')

    cursor.execute('''
    CREATE TABLE `vehicle_assignment_history` (
        `id` bigint(20) NOT NULL AUTO_INCREMENT,
        `start_date` datetime(6) NOT NULL,
        `end_date` datetime(6) DEFAULT NULL,
        `status` varchar(20) NOT NULL,
        `user_id` int(11) NOT NULL,
        `vehicle_id` int(11) NOT NULL,
        PRIMARY KEY (`id`),
        CONSTRAINT `vehicle_assignment_user_id_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
        CONSTRAINT `vehicle_assignment_vehicle_id_fk_vehicles_vehicle_id` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ''')
    
    db.commit()
    print("Tables created successfully.")
except Exception as e:
    print(f"Error: {e}")
except pymysql.err.Error as e:
    print(f"MySQL Error: {e}")
finally:
    db.close()
