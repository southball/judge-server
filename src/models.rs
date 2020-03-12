use crate::schema::*;
use serde::{Serialize, Deserialize};
use chrono::prelude::*;

#[derive(Clone, Queryable, Serialize, Deserialize)]
pub struct Problem {
    pub id: i32,
    pub public: bool,
    pub slug: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicProblem {
    pub id: i32,
    pub slug: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

impl PublicProblem {
    pub fn from(problem: Problem) -> PublicProblem {
        PublicProblem {
            id: problem.id,
            slug: problem.slug,
            title: problem.title,
            time_limit: problem.time_limit,
            memory_limit: problem.memory_limit,
        }
    }
}

#[derive(Clone, Insertable, Serialize, Deserialize)]
#[table_name="problems"]
pub struct NewProblem {
    pub public: bool,
    pub slug: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

#[derive(Clone, Queryable, Serialize, Deserialize)]
pub struct Contest {
    pub id: i32,
    pub public: bool,
    pub slug: String,
    pub title: String,
}

#[derive(Insertable, Serialize, Deserialize)]
#[table_name="contests"]
pub struct NewContest {
    pub public: bool,
    pub slug: String,
    pub title: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicContest {
    pub id: i32,
    pub slug: String,
    pub title: String,
}

impl PublicContest {
    pub fn from(contest: Contest) -> PublicContest {
        PublicContest {
            id: contest.id,
            slug: contest.slug,
            title: contest.title,
        }
    }
}

#[derive(Clone, Queryable, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub password_hash: String,
    pub password_salt: String,
    pub permissions: Vec<String>,
}

impl User {
    pub fn is_admin(&self) -> bool {
        self.permissions.iter().any(|p| p == "admin")
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicUser {
    pub id: i32,
    pub username: String,
    pub display_name: String,
}

impl PublicUser {
    pub fn from(user: User) -> PublicUser {
        PublicUser {
            id: user.id,
            username: user.username,
            display_name: user.display_name
        }
    }
}

#[derive(Clone, Insertable, Serialize, Deserialize)]
#[table_name="users"]
pub struct NewUser {
    pub username: String,
    pub display_name: String,
    pub password_hash: String,
    pub password_salt: String,
    pub permissions: Vec<String>,
}

#[derive(Clone, Queryable, Serialize, Deserialize)]
pub struct Submission {
    pub id: i32,
    pub date: NaiveDateTime,
    pub user_id: i32,
    pub problem_id: i32,
    pub contest_id: Option<i32>,
    pub contest_problem_id: Option<i32>,
    pub language: String,
    pub source_code: String,
    pub verdict: String,
    pub time: Option<f64>,
    pub memory: Option<i64>,
    pub verdict_json: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicSubmission {
    pub id: i32,
    pub username: String,
    pub problem_slug: String,
    pub language: String,
    pub source_code: String,
    pub verdict: Option<String>,
    pub time: Option<f64>,
    pub memory: Option<i64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicContestSubmission {
    pub id: i32,
    pub username: String,
    pub problem_slug: String,
    pub contest_slug: String,
    pub contest_problem_slug: String,
    pub language: String,
    pub source_code: String,
    pub verdict: Option<String>,
    pub time: Option<f64>,
    pub memory: Option<i64>,
}

#[derive(Clone, Insertable, Serialize, Deserialize)]
#[table_name="submissions"]
pub struct NewSubmission {
    pub user_id: i32,
    pub problem_id: i32,
    pub language: String,
    pub source_code: String,
}

#[derive(Clone, Insertable, Serialize, Deserialize)]
#[table_name="submissions"]
pub struct NewContestSubmission {
    pub user_id: i32,
    pub problem_id: i32,
    pub contest_id: i32,
    pub contest_problem_id: i32,
    pub language: String,
    pub source_code: String
}
