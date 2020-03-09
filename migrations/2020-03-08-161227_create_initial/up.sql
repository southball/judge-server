CREATE TABLE Problems (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    time_limit DOUBLE PRECISION NOT NULL,
    memory_limit BIGINT NOT NULL
);

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL
);

CREATE TABLE Submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id),
    problem_id INT NOT NULL REFERENCES Problems(id),
    language TEXT NOT NULL,
    source_code TEXT NOT NULL
);

