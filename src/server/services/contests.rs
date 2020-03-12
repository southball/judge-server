use actix_web::{web, HttpResponse, Responder};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/contests")
                .route(web::get().to(get_contests))
                .route(web::post().to(create_contest))
        )
        .service(
            web::resource("/contest/{contest_id}")
                .route(web::get().to(get_contest))
                .route(web::put().to(edit_contest))
                .route(web::delete().to(delete_contest))
        )
        .service(
            web::resource("/contest/{contest_id}/submit")
                .route(web::post().to(submit_to_contest))
        )
        .service(
            web::resource("/contest/{contest_id}/scoreboard")
                .route(web::get().to(get_scoreboard))
        );
}

async fn get_contests() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn get_contest() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn create_contest() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn edit_contest() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn delete_contest() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn submit_to_contest() -> impl Responder {

    HttpResponse::NotImplemented()
}

async fn get_scoreboard() -> impl Responder {

    HttpResponse::NotImplemented()
}

