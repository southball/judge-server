use actix_web::{web, HttpResponse, Responder};
use crate::AppState;
use crate::json::*;
use crate::models::NewProblem;
use crate::server::auth::get_session;
use crate::server::default_handlers;
use diesel::prelude::*;
use serde::{Serialize, Deserialize};
use crate::server::services::auth::AccessTokenProps;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/problems")
                .route(web::get().to(get_problems))
                .route(web::post().to(create_problem))
                .route(web::to(default_handlers::method_not_allowed))
        )
        .service(
            web::resource("/problem/{problem_slug}")
                .route(web::get().to(get_problem))
                .route(web::put().to(edit_problem))
                .route(web::delete().to(delete_problem))
        )
        .service(
            web::resource("/problem/{problem_slug}/testcases")
                .route(web::get().to(get_testcases))
                .route(web::put().to(update_testcases))
        );
}

async fn get_testcases() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn update_testcases() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn get_problem(
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

    if problem.is_empty() {
        default_handlers::not_found().await
    } else {
        HttpResponse::Ok().json(json_ok(Some(&problem[0])))
    }
}

async fn edit_problem(
    state: web::Data<AppState>,
    path: web::Path<(String,)>,
) -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn delete_problem(
    state: web::Data<AppState>,
    path: web::Path<(String,)>,
    props: web::Json<AccessTokenProps>,
) -> impl Responder {
    use crate::models::Problem;
    use crate::schema::problems;

    match get_session(&state, &props.access_token, Some("admin")).await {
        Err(response) => response,
        Ok(session) => {
            let connection = state.pool.get().expect("Failed to get connection");
            let slug = path.0.clone();
            let problem: Vec<Problem> = web::block(move || {
                problems::table
                    .filter(problems::slug.eq(&slug))
                    .load::<Problem>(&connection)
            }).await.unwrap();

            if problem.is_empty() {
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
