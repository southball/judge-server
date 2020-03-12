CREATE TABLE Problems (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    time_limit DOUBLE PRECISION NOT NULL,
    memory_limit BIGINT NOT NULL
);

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    permissions TEXT[] NOT NULL
);

CREATE TABLE Contests (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL
);

CREATE TABLE ContestProblems (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL,
    contest_id INT REFERENCES Contests(id),
    problem_id INT REFERENCES Problems(id),
    UNIQUE(contest_id, slug)
);

CREATE TABLE Submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id),
    problem_id INT NOT NULL REFERENCES Problems(id),
    contest_id INT REFERENCES Contests(id),
    contest_problem_id INT REFERENCES ContestProblems(id),
    language TEXT NOT NULL,
    source_code TEXT NOT NULL,
    verdict TEXT NOT NULL
);
