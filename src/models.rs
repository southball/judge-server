use crate::schema::*;
use serde::{Serialize, Deserialize};

#[derive(Clone, Queryable, Serialize, Deserialize)]
pub struct Problem {
    pub id: i32,
    pub slug: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

#[derive(Clone, Insertable, Serialize, Deserialize)]
#[table_name="problems"]
pub struct NewProblem {
    pub slug: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
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
    pub user_id: i32,
    pub problem_id: i32,
    pub contest_id: Option<i32>,
    pub contest_problem_id: Option<i32>,
    pub language: String,
    pub source_code: String
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
