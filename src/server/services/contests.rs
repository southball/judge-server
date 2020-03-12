use actix_web::{web, HttpResponse, Responder};
use crate::AppState;
use crate::json::json_ok;
use diesel::prelude::*;
use crate::server::services::auth::{AccessTokenProps, get_session};
use crate::server::default_handlers;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .service(
            web::resource("/contests")
                .route(web::get().to(get_contests))
                .route(web::post().to(create_contest))
        )
        .service(
            web::resource("/contest/{contest_id}")
                .route(web::get().to(get_contest))
                .route(web::put().to(edit_contest))
                .route(web::delete().to(delete_contest))
        )
        .service(
            web::resource("/contest/{contest_id}/submit")
                .route(web::post().to(submit_to_contest))
        )
        .service(
            web::resource("/contest/{contest_id}/scoreboard")
                .route(web::get().to(get_scoreboard))
        );
}

async fn get_contests(
    state: web::Data<AppState>,
    props: Option<web::Json<AccessTokenProps>>,
) -> impl Responder {
    use crate::models::{Contest, PublicContest};
    use crate::schema::contests;

    let connection = state.pool.get().expect("Failed to get connection");

    let contests = web::block(move || {
        contests::table.load::<Contest>(&connection)
    }).await.unwrap();

    match props {
        Some(props) => match get_session(&state, &props.access_token, None).await {
            Ok(state) => if state.user.is_admin() {
                return HttpResponse::Ok().json(json_ok(Some(&contests)));
            },
            Err(response) => return response,
        },
        _ => ()
    }

    let public_contests = contests.clone()
        .into_iter()
        .filter(|c| c.public)
        .map(PublicContest::from)
        .collect::<Vec<_>>();

    HttpResponse::Ok().json(json_ok(Some(&public_contests)))
}

async fn get_contest(
    state: web::Data<AppState>,
    path: web::Path<(String,)>,
    props: Option<web::Json<AccessTokenProps>>,
) -> impl Responder {
    use crate::models::{Contest, PublicContest};
    use crate::schema::contests;

    let slug = path.0.clone();
    let connection = state.pool.get().expect("Failed to get connection");

    let contest: Vec<Contest> = web::block(move || {
        contests::table
            .filter(contests::slug.eq(slug))
            .load::<Contest>(&connection)
    }).await.unwrap();

    if contest.len() == 0 {
        return default_handlers::not_found().await;
    }

    let contest = contest.into_iter().next().unwrap();

    match props {
        Some(props) => match get_session(&state, &props.access_token, None).await {
            Ok(state) => if state.user.is_admin() {
                return HttpResponse::Ok().json(json_ok(Some(&contest)));
            },
            Err(response) => return response,
        },
        _ => ()
    }

    HttpResponse::Ok().json(json_ok(Some(&PublicContest::from(contest))))
}

async fn create_contest() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn edit_contest() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn delete_contest() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn submit_to_contest() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

async fn get_scoreboard() -> impl Responder {
    // TODO implement route
    HttpResponse::NotImplemented()
}

