mod services;
pub mod default_handlers;

use actix_web::web;
pub use services::*;

/// Configures the routes in the server.
pub fn configure_server(cfg: &mut web::ServiceConfig) {
    auth::configure(cfg);
    contests::configure(cfg);
    problems::configure(cfg);
    submissions::configure(cfg);

    cfg.route("*", web::to(default_handlers::not_found));
}
