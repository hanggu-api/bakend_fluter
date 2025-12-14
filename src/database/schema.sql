-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('client', 'provider', 'admin') NOT NULL DEFAULT 'client',
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Providers Table (Extension)
CREATE TABLE IF NOT EXISTS providers (
    user_id BIGINT PRIMARY KEY,
    bio TEXT,
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_online BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon_slug VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    client_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    provider_id BIGINT,
    description TEXT,
    status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    price_estimated DECIMAL(10,2),
    price_upfront DECIMAL(10,2),
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES service_categories(id),
    FOREIGN KEY (provider_id) REFERENCES providers(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('deposit', 'final_payment', 'payout', 'refund') NOT NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    provider_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES service_requests(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    type ENUM('text', 'image', 'audio', 'location') DEFAULT 'text',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (service_id) REFERENCES service_requests(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Categories (Safe Insert)
INSERT IGNORE INTO service_categories (name, icon_slug) VALUES 
('Encanamento', 'droplets'),
('Elétrica', 'zap'),
('Pintura', 'paintbrush'),
('Marcenaria', 'hammer'),
('Manutenção', 'wrench'),
('Geral', 'home');
