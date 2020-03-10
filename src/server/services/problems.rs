use actix_web::{web, HttpResponse, Responder, FromRequest};
use crate::AppState;
use crate::json::*;
use crate::models::NewProblem;
use crate::server::auth::get_session;
use crate::server::default_handlers;
use diesel::prelude::*;
use serde::{Serialize, Deserialize};
use crate::server::services::auth::{AccessTokenProps, Session};
use actix_http::Response;
use std::future::Future;
use actix_http::body::Body;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/problems")
                .route(web::get().to(get_problems))
                .route(web::to(default_handlers::method_not_allowed))
        )
        .service(
            web::resource("/problem/{problem_slug}")
                .route(web::get().to(get_problem_by_slug))
                .route(web::delete().to(delete_problem_by_slug))
        )
        .service(
            web::resource("/problem")
                .app_data(web::Json::<NewProblem>::configure(|cfg| {
                    cfg.error_handler(|err, _| {
                        log::trace!("Failed to parse request: {:?}", err);
                        HttpResponse::BadRequest()
                            .json(json_error("Failed to parse request."))
                            .into()
                    })
                }))
                .route(web::post().to(create_problem))
                .route(web::to(default_handlers::method_not_allowed))
        );
}

async fn get_problem_by_slug(
    state: web::Data<AppState>,
    path: web::Path<(String,)>,
) -> impl Responder {
    use crate::models::Problem;
    use crate::schema::problems;

    let connection = state.pool.get().expect("Failed to get connection");
    let slug = path.0.clone();
    let problem: Vec<Problem> = web::block(move || {
        problems::table
            .filter(problems::slug.eq(&slug))
            .load::<Problem>(&connection)
    }).await.unwrap();

    if problem.len() == 0 {
        default_handlers::not_found().await
    } else {
        HttpResponse::Ok().json(json_ok(Some(&problem[0])))
    }
}

async fn delete_problem_by_slug(
    state: web::Data<AppState>,
    path: web::Path<(String,)>,
    props: web::Json<AccessTokenProps>,
) -> impl Responder {
    use crate::models::Problem;
    use crate::schema::problems;

    log::debug!("Delete problem by slug");

    match get_session(&state, &props.access_token, Some("admin")).await {
        Err(response) => response,
        Ok(session) => {
            let connection = state.pool.get().expect("Failed to get connection");
            let slug = path.0.clone();
            let problem = web::block(move || {
                problems::table
                    .filter(problems::slug.eq(&slug))
                    .load::<Problem>(&connection)
            }).await.unwrap();

            if problem.len() == 0 {
                return default_handlers::not_found().await;
            }

            let connection = state.pool.get().expect("Failed to get connection");
            let slug = path.0.clone();
            let delete_result = web::block(move || {
                diesel::delete(problems::table.filter(problems::slug.eq(&slug)))
                    .execute(&connection)
            }).await;

            match delete_result {
                Ok(_) => HttpResponse::Ok().json(json_ok::<()>(None)),
                Err(e) => HttpResponse::InternalServerError().json(json_error(
                    &format!("Failed to delete problem {}: {}", &path.0, &e.to_string())
                )),
            }
        },
    }
}

async fn get_problems(
    state: web::Data<AppState>,
) -> impl Responder {
    use crate::schema::problems;
    use crate::models::Problem;

    let connection = state.pool.get().expect("Failed to get database connection from pool.");

    let result = web::block(move || {
        problems::table
            .load::<Problem>(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(json_ok(Some(&result)))
}

async fn create_problem(
    state: web::Data<AppState>,
    data: web::Json<CreateProblemProps>,
) -> impl Responder {
    use crate::schema::problems;
    use crate::models::Problem;

    match get_session(&state, &data.access_token, Some("admin")).await {
        Ok(session) => {
            if session.user.permissions.iter().any(|p| p == "admin") {
            }

            let connection = state.pool.get().expect("Failed to get database connection from pool.");

            let problem = web::block(move || {
                diesel::insert_into(problems::table)
                    .values(&data.new_problem)
                    .load::<Problem>(&connection)
            }).await.unwrap();

            HttpResponse::Ok().json(Some(&problem[0]))
        },
        Err(response) => response
    }
}

#[derive(Serialize, Deserialize)]
pub struct CreateProblemProps {
    access_token: String,
    new_problem: NewProblem,
}
