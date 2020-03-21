use actix_web::{web, Responder, HttpResponse};
use crate::AppState;
use crate::json::{json_ok, json_error};
use crate::server::default_handlers;
use crate::server::services::auth::get_session;
use diesel::prelude::*;
use serde::{Serialize, Deserialize};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/submission/{submission_id}")
                .route(web::get().to(get_submission))
        )
        .service(
            web::resource("/submission/{submission_id}/judge")
                .route(web::put().to(judge_update_submission))
        )
        .route("/submit", web::post().to(submit));
}

async fn get_submission() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn judge_update_submission() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn submit(
    state: web::Data<AppState>,
    props: web::Json<SubmitProps>,
) -> impl Responder {
    use crate::models::{NewSubmission, Submission, Problem};
    use crate::schema::{submissions, problems};

    if let Ok(session) = get_session(&state, &props.access_token, None).await {
        let connection = state.pool.get().expect("Failed to get connection.");
        let slug = props.problem_slug.clone();
        let problem: Vec<Problem> = web::block(move || {
            problems::table
                .filter(problems::slug.eq(&slug))
                .load::<Problem>(&connection)
        }).await.unwrap();

        if problem.is_empty() {
            return HttpResponse::BadRequest().json(json_error("Problem not found."));
        }

        let new_submission = NewSubmission {
            user_id: session.user.id,
            problem_id: problem[0].id,
            language: props.language.clone(),
            source_code: props.source_code.clone(),
        };

        let connection = state.pool.get().expect("Failed to get connection.");
        let submission = web::block(move || {
            diesel::insert_into(submissions::table)
                .values(&new_submission)
                .load::<Submission>(&connection)
        }).await.unwrap();

        HttpResponse::Ok().json(json_ok(Some(&submission[0])))
    } else {
        default_handlers::forbidden().await
    }
}

#[derive(Serialize, Deserialize)]
struct SubmitProps {
    pub access_token: String,
    pub problem_slug: String,
    pub language: String,
    pub source_code: String,
}
