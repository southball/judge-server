#[macro_use]
extern crate diesel;

mod cli;
mod schema;
mod models;
mod server;
mod json;

use cli::Opts;
use clap::derive::Clap;
use diesel::pg::PgConnection;
use diesel::r2d2;
use simplelog::{CombinedLogger, Config, TermLogger, TerminalMode};
use actix_web::{web, HttpServer, App};

pub type DbPool = r2d2::Pool<r2d2::ConnectionManager<PgConnection>>;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    let opts: Opts = Opts::parse();

    // Derive log level from CLI options and construct logger.
    let log_level = cli::calc_log_level(opts.verbosity, opts.quiet);

    CombinedLogger::init(
        vec![
            TermLogger::new(log_level, Config::default(), TerminalMode::Mixed).unwrap()
        ]
    ).unwrap();

    log::debug!("Launching server...");

    let database_address = opts.database.clone();
    HttpServer::new(move || {
        App::new()
            .configure(configure_database(&database_address))
            .configure(server::configure_server)
    })
        .bind(&opts.address)?
        .run()
        .await
}

fn configure_database(address: &str) -> impl Fn(&mut web::ServiceConfig) -> () + '_ {
    move |cfg: &mut web::ServiceConfig| {
        let manager = r2d2::ConnectionManager::<PgConnection>::new(address);
        let pool = r2d2::Pool::builder()
            .build(manager)
            .expect("Failed to create database connection pool.");
        log::debug!("Connected to database.");

        cfg.data(pool.clone());
    }
}
