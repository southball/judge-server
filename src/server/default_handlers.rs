use actix_web::{web, HttpResponse, Responder};
use crate::json::json_error;
use serde::{Serialize, Deserialize};

pub async fn method_not_allowed() -> impl Responder {
    HttpResponse::MethodNotAllowed()
        .json(json_error("Method not allowed."))
}

pub async fn not_found() -> impl Responder {
    HttpResponse::NotFound()
        .json(json_error("Not found."))
}
