use actix_web::{HttpResponse, Responder};
use crate::json::json_error;

pub async fn method_not_allowed() -> impl Responder {
    HttpResponse::MethodNotAllowed()
        .json(json_error("Method not allowed."))
}

pub async fn not_found() -> impl Responder {
    HttpResponse::NotFound()
        .json(json_error("Not found."))
}
