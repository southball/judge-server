use actix_web::{HttpResponse, web, FromRequest};
use crate::json::json_error;

pub async fn method_not_allowed() -> HttpResponse {
    HttpResponse::MethodNotAllowed()
        .json(json_error("Method not allowed."))
}

pub async fn not_found() -> HttpResponse {
    HttpResponse::NotFound()
        .json(json_error("Not found."))
}

pub async fn unauthorized() -> HttpResponse {
    HttpResponse::Unauthorized()
        .json(json_error("Unauthorized."))
}

pub async fn forbidden() -> HttpResponse {
    HttpResponse::Forbidden()
        .json(json_error("Forbidden."))
}

pub async fn not_enough_permission() -> HttpResponse {
    HttpResponse::Forbidden()
        .json(json_error("Not enough permission."))
}

pub async fn internal_server_error() -> HttpResponse {
    HttpResponse::InternalServerError()
        .json(json_error("Unexpected internal server error."))
}
