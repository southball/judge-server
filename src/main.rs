#[macro_use]
extern crate diesel;

mod cli;
mod schema;
mod models;
mod server;
mod json;
mod structs;

use cli::Opts;
use clap::derive::Clap;
use diesel::pg::PgConnection;
use diesel::r2d2;
use simplelog::{CombinedLogger, Config, TermLogger, TerminalMode};
use actix_web::{web, HttpServer, App};

pub type DbPool = r2d2::Pool<r2d2::ConnectionManager<PgConnection>>;

pub struct AppState {
    pub pool: DbPool,
    pub opts: Opts,
}

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

    log::debug!("Creating folder.");
    std::fs::create_dir_all(std::path::Path::new(&opts.folder));

    log::debug!("Preparing server...");
    let opts_clone = opts.clone();
    let server = HttpServer::new(move || {
        App::new()
            .configure(configure_app_state(&opts_clone))
            .configure(server::configure_server)
    });

    log::debug!("Launching server...");
    server
        .bind(&opts.address)?
        .run()
        .await
}

fn configure_app_state(opts: &Opts) -> impl Fn(&mut web::ServiceConfig) -> () + '_ {
    move |cfg: &mut web::ServiceConfig| {
        let manager = r2d2::ConnectionManager::<PgConnection>::new(&opts.database);
        let pool = r2d2::Pool::builder()
            .build(manager)
            .expect("Failed to create database connection pool.");
        log::debug!("Connected to database.");

        cfg.data(AppState {
            pool: pool.clone(),
            opts: opts.clone(),
        });
    }
}
