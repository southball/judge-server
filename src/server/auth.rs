use actix_web::{web, HttpResponse};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::scope("/auth")
            .route("/", web::get().to(|_: actix_web::HttpRequest| HttpResponse::Ok().body("Auth Resource")))
        );
}
