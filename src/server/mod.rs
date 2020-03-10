mod auth;
mod problems;
mod default_handlers;

use actix_web::web;

/// Configures the routes in the server.
pub fn configure_server(cfg: &mut web::ServiceConfig) {
    auth::configure(cfg);
    problems::configure(cfg);

    cfg.route("*", web::to(default_handlers::not_found));
}
