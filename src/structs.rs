use judge_definitions::JudgeOutput;
use serde::{Serialize, Deserialize};
use chrono::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct JudgingProps {
    pub judge_name: String,
    /// The time when the judging process started.
    pub judge_date: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct JudgedProps {
    pub judge_name: String,
    /// The time when the judging process ended.
    pub judge_date: DateTime<Utc>,
    pub verdict: JudgeOutput,
}

#[derive(Serialize, Deserialize)]
pub enum Verdict {
    PendingJudge,
    Judging(JudgingProps),
    Judged(JudgedProps),
}
