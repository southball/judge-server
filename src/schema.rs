table! {
    problems (id) {
        id -> Int4,
        title -> Text,
        time_limit -> Float8,
        memory_limit -> Int8,
    }
}

table! {
    submissions (id) {
        id -> Int4,
        user_id -> Int4,
        problem_id -> Int4,
        language -> Text,
        source_code -> Text,
    }
}

table! {
    users (id) {
        id -> Int4,
        username -> Text,
        display_name -> Text,
        password_hash -> Text,
        password_salt -> Text,
    }
}

joinable!(submissions -> problems (problem_id));
joinable!(submissions -> users (user_id));

allow_tables_to_appear_in_same_query!(
    problems,
    submissions,
    users,
);
