use actix_web::{error, web, HttpResponse, Responder, FromRequest, ResponseError};

use diesel::prelude::*;
use crate::schema::*;
use crate::models::*;
use crate::DbPool;
use crate::json::*;
use crate::server::default_handlers;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/problems")
                .route(web::get().to(get_problems))
                .route(web::to(default_handlers::method_not_allowed))
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

async fn get_problems(
    pool: web::Data<DbPool>
) -> impl Responder {
    use crate::schema::*;

    let connection = pool.get().expect("Failed to get database connection from pool.");

    let result = web::block(move || {
        problems::table
            .load::<Problem>(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(json_ok(&result))
}

async fn create_problem(
    pool: web::Data<DbPool>,
    data: web::Json<NewProblem>,
) -> impl Responder {
    use crate::schema::*;

    let connection = pool.get().expect("Failed to get database connection from pool.");

    let problem = web::block(move || {
        diesel::insert_into(problems::table)
            .values(&data.0)
            .load::<Problem>(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(&problem[0])
}
