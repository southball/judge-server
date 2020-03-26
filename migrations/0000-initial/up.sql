CREATE TABLE Problems
(
    id           SERIAL PRIMARY KEY,
    public       BOOLEAN          NOT NULL,
    slug         TEXT             NOT NULL UNIQUE,
    title        TEXT             NOT NULL,
    time_limit   DOUBLE PRECISION NOT NULL,
    memory_limit BIGINT           NOT NULL
);

CREATE TABLE Users
(
    id            SERIAL PRIMARY KEY,
    username      TEXT   NOT NULL UNIQUE,
    email         TEXT   NULL,
    display_name  TEXT   NOT NULL,
    password_hash TEXT   NOT NULL,
    password_salt TEXT   NOT NULL,
    permissions   TEXT[] NOT NULL
);

CREATE TABLE Contests
(
    id     SERIAL PRIMARY KEY,
    public BOOLEAN NOT NULL,
    slug   TEXT    NOT NULL UNIQUE,
    title  TEXT    NOT NULL
);

CREATE TABLE ContestProblems
(
    id         SERIAL PRIMARY KEY,
    slug       TEXT NOT NULL,
    contest_id INT  NOT NULL REFERENCES Contests (id),
    problem_id INT  NOT NULL REFERENCES Problems (id),
    UNIQUE (contest_id, slug)
);

CREATE TABLE Submissions
(
    id                 SERIAL PRIMARY KEY,
    date               TIMESTAMPTZ      NOT NULL,
    user_id            INT              NOT NULL REFERENCES Users (id),
    problem_id         INT              NOT NULL REFERENCES Problems (id),
    contest_id         INT              NULL REFERENCES Contests (id),
    contest_problem_id INT              NULL REFERENCES ContestProblems (id),
    language           TEXT             NOT NULL,
    source_code        TEXT             NOT NULL,
    verdict            TEXT             NOT NULL,
    time               DOUBLE PRECISION NULL,
    memory             BIGINT           NULL,
    verdict_json       TEXT             NULL
);
