use clap::Clap;
use std::clone::Clone;
use simplelog::LevelFilter;

/// Judge-Server
/// The judge server handling all data of the judge.
#[derive(Clap, Clone)]
#[clap(version = "0.0-alpha.1", author = "Southball")]
pub struct Opts {
    /// The PostgreSQL database connection URL.
    #[clap(long = "database")]
    pub database: String,

    /// The level of verbosity.
    #[clap(short = "v", long = "verbose", parse(from_occurrences))]
    pub verbosity: i32,

    /// Whether the log should be suppressed. This option overrides the verbose option.
    #[clap(short = "q", long = "quiet")]
    pub quiet: bool,

    /// The address and port to bind to.
    #[clap(long = "address")]
    pub address: String,

    /// The encryption key for JWT.
    #[clap(long = "key")]
    pub key: String,

    /// The folder to store all the data, including testcases, checkers, etc.
    #[clap(long = "folder")]
    pub folder: String,
}

pub fn calc_log_level(verbosity: i32, quiet: bool) -> LevelFilter {
    if quiet {
        LevelFilter::Off
    } else {
        match verbosity {
            0 => LevelFilter::Warn,
            1 => LevelFilter::Info,
            2 => LevelFilter::Debug,
            _ => LevelFilter::Trace,
        }
    }
}
