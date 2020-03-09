mod auth;
mod problems;
mod default_handlers;

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use diesel::prelude::*;
use crate::schema::*;
use crate::models::*;
use crate::DbPool;

/// Configures the routes in the server.
pub fn configure_server(cfg: &mut web::ServiceConfig) {
    auth::configure(cfg);
    problems::configure(cfg);

    cfg.route("*", web::to(default_handlers::not_found));
}

#[derive(Serialize, Deserialize)]
struct ProblemList {
    problems: Vec<Problem>,
}
