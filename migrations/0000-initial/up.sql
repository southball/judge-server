CREATE TABLE Problems
(
    id                   SERIAL PRIMARY KEY,
    is_public            BOOLEAN          NOT NULL,
    type                 TEXT             NOT NULL,
    slug                 TEXT             NOT NULL UNIQUE,
    title                TEXT             NOT NULL,
    statement            TEXT             NOT NULL,
    time_limit           DOUBLE PRECISION NOT NULL,
    memory_limit         BIGINT           NOT NULL,
    compile_time_limit   DOUBLE PRECISION NOT NULL,
    compile_memory_limit BIGINT           NOT NULL,
    checker_time_limit   DOUBLE PRECISION NOT NULL,
    checker_memory_limit BIGINT           NOT NULL,
    checker              TEXT             NOT NULL DEFAULT '',
    interactor           TEXT             NOT NULL DEFAULT '',
    testcases            TEXT[][]         NOT NULL DEFAULT '{}'
);

CREATE TABLE Users
(
    id                SERIAL PRIMARY KEY,
    username          TEXT        NOT NULL UNIQUE,
    email             TEXT        NULL,
    display_name      TEXT        NOT NULL,
    password_hash     TEXT        NOT NULL,
    password_salt     TEXT        NOT NULL,
    registration_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    permissions       TEXT[]      NOT NULL
);

CREATE TABLE Contests
(
    id         SERIAL PRIMARY KEY,
    is_public  BOOLEAN     NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,
    title      TEXT        NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time   TIMESTAMPTZ NOT NULL
);

CREATE TABLE ContestProblems
(
    id         SERIAL PRIMARY KEY,
    slug       TEXT NOT NULL,
    contest_id INT  NOT NULL REFERENCES Contests (id) ON DELETE CASCADE,
    problem_id INT  NOT NULL REFERENCES Problems (id) ON DELETE CASCADE,
    UNIQUE (contest_id, slug)
);

CREATE INDEX ContestProblems_contest_id_index ON ContestProblems (contest_id);
CREATE INDEX ContestProblems_problem_id_index ON ContestProblems (problem_id);

CREATE TABLE Submissions
(
    id                 SERIAL PRIMARY KEY,
    date               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    user_id            INT              NOT NULL REFERENCES Users (id) ON DELETE CASCADE,
    problem_id         INT              NOT NULL REFERENCES Problems (id) ON DELETE CASCADE,
    contest_id         INT              NULL REFERENCES Contests (id) ON DELETE CASCADE,
    contest_problem_id INT              NULL REFERENCES ContestProblems (id) ON DELETE CASCADE,
    language           TEXT             NOT NULL,
    source_code        TEXT             NOT NULL,
    verdict            TEXT             NOT NULL,
    time               DOUBLE PRECISION NULL,
    memory             BIGINT           NULL,
    verdict_json       TEXT             NULL
);

CREATE INDEX IF NOT EXISTS Submissions_user_id_index ON Submissions (user_id);
CREATE INDEX IF NOT EXISTS Submissions_problem_id_index ON Submissions (problem_id);
CREATE INDEX IF NOT EXISTS Submissions_contest_id_index ON Submissions (contest_id);
CREATE INDEX IF NOT EXISTS Submissions_contest_problem_id_index ON Submissions (problem_id);

CREATE TABLE ContestRegistrations
(
    contest_id INT NOT NULL REFERENCES Contests (id) ON DELETE CASCADE,
    user_id    INT NOT NULL REFERENCES Users (id) ON DELETE CASCADE,
    PRIMARY KEY (contest_id, user_id)
);
