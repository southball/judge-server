use actix_web::{error, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use diesel::prelude::*;
use crate::schema::*;
use crate::models::*;
use crate::DbPool;

/// Configures the routes in the server.
pub fn configure_server(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/", web::get().to(index))
        .service(
            web::resource("/problem")
                .app_data(web::JsonConfig::default().error_handler(|err, _| {
                    log::debug!("Error: {:?}", err);
                    HttpResponse::BadRequest().body("400 Bad Request").into()
                }))
                .route(web::post().to(create_problem))
        );
}

/// Configure the default service, including the 404 handler.
pub fn configure_default_service() -> actix_web::Resource {
    web::resource("")
        .route(web::route().to(handler_404))
}

#[derive(Serialize, Deserialize)]
struct ProblemList {
    problems: Vec<Problem>,
}

async fn index(
    pool: web::Data<DbPool>
) -> impl Responder {
    let connection = pool.get().expect("Failed to get database connection from pool.");

    let result = web::block(move || {
        problems::table
            .load::<Problem>(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(&ProblemList {
        problems: result
    })
}

async fn create_problem(
    pool: web::Data<DbPool>,
    data: web::Json<NewProblem>,
) -> impl Responder {
    let connection = pool.get().expect("Failed to get database connection from pool.");

    let problem = web::block(move || {
        diesel::insert_into(problems::table)
            .values(&data.0)
            .load::<Problem>(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(&problem[0])
}

async fn handler_404() -> impl Responder {
    HttpResponse::NotFound().body("404 Not Found")
}
