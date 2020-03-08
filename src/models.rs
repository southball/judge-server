use crate::schema::problems;
use serde::{Serialize, Deserialize};

#[derive(Queryable, Debug, Serialize, Deserialize)]
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
