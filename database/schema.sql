CREATE TABLE users (
    email VARCHAR(100) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student','librarian')),
    password_hash VARCHAR(500) NOT NULL
);

CREATE TABLE students(
    email VARCHAR(100) UNIQUE NOT NULL,
    roll_no VARCHAR(20) PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    year_of_study INT NOT NULL,

    FOREIGN KEY(email)
        REFERENCES users(email)
        ON DELETE CASCADE
        ON UPDATE CASCADE   
);


CREATE TABLE librarian(
    email VARCHAR(100) UNIQUE NOT NULL,
    staff_id VARCHAR(20) PRIMARY KEY,

    FOREIGN KEY(email)
        REFERENCES users(email)
        ON DELETE CASCADE
        ON UPDATE CASCADE   
);

CREATE TABLE otps(
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL
);