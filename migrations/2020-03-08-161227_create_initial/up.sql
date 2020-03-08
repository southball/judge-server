CREATE TABLE Problems (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    time_limit DOUBLE PRECISION NOT NULL,
    memory_limit BIGINT NOT NULL
);
