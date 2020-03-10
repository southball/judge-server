use actix_web::{web, HttpResponse, Responder};
use crate::AppState;
use crate::json::{json_ok, json_error};
use data_encoding::HEXUPPER;
use diesel::prelude::*;
use ring::error::Unspecified;
use ring::rand::SecureRandom;
use ring::{digest, pbkdf2, rand};
use serde::{Serialize, Deserialize};
use std::num::NonZeroU32;
use super::default_handlers;
use jsonwebtoken::DecodingKey;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/auth")
        .route("/register", web::post().to(register_public))
        .route("/login", web::get().to(login_public))
        .route("/refresh", web::get().to(refresh_public))
        .route("*", web::to(default_handlers::not_found)));
}

async fn register_public(
    state: web::Data<AppState>,
    data: web::Json<RegisterProps>,
) -> impl Responder {
    use crate::models::NewUser;
    use crate::schema::users;

    let connection = state.pool.get().expect("Failed to get connection.");

    let salted_hash = SaltedHash::generate(&data.password).unwrap();

    let new_user = NewUser {
        username: data.username.clone(),
        display_name: data.display_name.clone(),
        password_salt: salted_hash.salt,
        password_hash: salted_hash.hash,
        permissions: vec![]
    };

    web::block(move || {
        diesel::insert_into(users::table)
            .values(&new_user)
            .execute(&connection)
    }).await.unwrap();

    HttpResponse::Ok().json(json_ok::<()>(None))
}

async fn login_public(
    state: web::Data<AppState>,
    data: web::Json<LoginProps>,
) -> impl Responder {
    use crate::schema::users;
    use crate::models::User;

    let connection = state.pool.get().expect("Failed to get connection.");
    let login_fail = HttpResponse::NotFound().json(json_error("Wrong username or password."));

    let username = data.username.clone();
    let user: Vec<User> = web::block(move || {
        users::table
            .filter(users::username.eq(&username))
            .load::<User>(&connection)
    }).await.unwrap();

    if user.len() == 0 {
        return login_fail;
    }

    let user = &user[0];
    let salted_hash = SaltedHash { salt: user.password_salt.clone(), hash: user.password_hash.clone() };
    let verified = salted_hash.verify(&data.password).unwrap();

    if !verified {
        login_fail
    } else {
        HttpResponse::Ok().json(json_ok(Some(&JWTResponse {
            access_token: generate_jwt_access_token(&state.opts.key, &user.username),
            refresh_token: generate_jwt_refresh_token(&state.opts.key, &user.username),
        })))
    }
}

async fn refresh_public(
    state: web::Data<AppState>,
    data: web::Json<RefreshProps>,
) -> impl Responder {
    if let Ok(token) = decode_jwt(&state.opts.key, &data.refresh_token) {
        if token.refresh {
            HttpResponse::Ok().json(json_ok(Some(&JWTResponse {
                refresh_token: data.refresh_token.to_string(),
                access_token: generate_jwt_access_token(&state.opts.key, &token.sub),
            })))
        } else {
            HttpResponse::BadRequest().json(json_error("The token is not a refresh token."))
        }
    } else {
        HttpResponse::BadRequest().json(json_error("The refresh token is invalid."))
    }
}

#[derive(Serialize, Deserialize)]
struct JWTResponse {
    access_token: String,
    refresh_token: String,
}

#[derive(Serialize, Deserialize)]
struct RegisterProps {
    username: String,
    display_name: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct LoginProps {
    username: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct RefreshProps {
    refresh_token: String,
}

struct SaltedHash {
    salt: String,
    hash: String,
}

impl SaltedHash {
    const CREDENTIAL_LEN: usize = digest::SHA512_OUTPUT_LEN;
    const N_ITER: u32 = 25_000;

    fn generate(password: &str) -> Result<SaltedHash, Unspecified> {
        let rng = rand::SystemRandom::new();
        let n_iter: NonZeroU32 = NonZeroU32::new(SaltedHash::N_ITER).unwrap();

        let mut salt = [0u8; SaltedHash::CREDENTIAL_LEN];
        let mut pbkdf2_hash = [0u8; SaltedHash::CREDENTIAL_LEN];

        rng.fill(&mut salt)?;
        pbkdf2::derive(
            pbkdf2::PBKDF2_HMAC_SHA512,
            n_iter,
            &salt,
            password.as_bytes(),
            &mut pbkdf2_hash,
        );

        Ok(SaltedHash {
            salt: HEXUPPER.encode(&salt),
            hash: HEXUPPER.encode(&pbkdf2_hash),
        })
    }

    fn verify(&self, password: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let n_iter: NonZeroU32 = NonZeroU32::new(SaltedHash::N_ITER).unwrap();
        let result = pbkdf2::verify(
            pbkdf2::PBKDF2_HMAC_SHA512,
            n_iter,
            &HEXUPPER.decode(self.salt.as_bytes())?[..],
            password.as_bytes(),
            &HEXUPPER.decode(self.hash.as_bytes())?[..],
        ).is_ok();

        Ok(result)
    }
}

#[derive(Serialize, Deserialize)]
struct Claims {
    /// The expiry time.
    exp: u64,
    /// Subject: the username.
    sub: String,
    /// Whether the token is a refresh token.
    refresh: bool,
}

fn encode_jwt(key: &str, username: &str, expire_seconds: u64, refresh: bool) -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    use jsonwebtoken::{EncodingKey, Header};

    let expiry = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards.")
        .as_secs() + expire_seconds;

    jsonwebtoken::encode(
        &Header::default(),
        &Claims {
            exp: expiry,
            sub: username.to_string(),
            refresh
        },
        &EncodingKey::from_secret(key.as_bytes())
    ).unwrap()
}

fn generate_jwt_refresh_token(key: &str, username: &str) -> String {
    const SECONDS_IN_1_WEEK: u64 = 7 * 24 * 60 * 60;
    encode_jwt(key, username, SECONDS_IN_1_WEEK, true)
}

fn generate_jwt_access_token(key: &str, username: &str) -> String {
    const SECONDS_IN_20_MINUTES: u64 = 20 * 60;
    encode_jwt(key, username, SECONDS_IN_20_MINUTES, false)
}

fn decode_jwt(key: &str, jwt: &str) -> Result<Claims, Box<dyn std::error::Error>> {
    use jsonwebtoken::{decode, Validation};
    let result = decode::<Claims>(jwt, &DecodingKey::from_secret(key.as_bytes()), &Validation::default())?;

    Ok(result.claims)
}
