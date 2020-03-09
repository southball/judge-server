use crate::schema::problems;
use serde::{Serialize, Deserialize};

#[derive(Queryable, Serialize, Deserialize)]
pub struct Problem {
    pub id: i32,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

#[derive(Insertable, Serialize, Deserialize)]
#[table_name="problems"]
pub struct NewProblem {
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i64,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub password_hash: String,
    pub password_salt: String
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct Submission {
    pub id: i32,
    pub user_id: i32,
    pub problem_id: i32,
    pub language: String,
    pub source_code: String
}
