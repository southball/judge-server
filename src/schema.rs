table! {
    contestproblems (id) {
        id -> Int4,
        slug -> Text,
        contest_id -> Nullable<Int4>,
        problem_id -> Nullable<Int4>,
    }
}

table! {
    contests (id) {
        id -> Int4,
        slug -> Text,
        title -> Text,
    }
}

table! {
    problems (id) {
        id -> Int4,
        slug -> Text,
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
        contest_id -> Nullable<Int4>,
        contest_problem_id -> Nullable<Int4>,
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
        permissions -> Array<Text>,
    }
}

joinable!(contestproblems -> contests (contest_id));
joinable!(contestproblems -> problems (problem_id));
joinable!(submissions -> contestproblems (contest_problem_id));
joinable!(submissions -> contests (contest_id));
joinable!(submissions -> problems (problem_id));
joinable!(submissions -> users (user_id));

allow_tables_to_appear_in_same_query!(
    contestproblems,
    contests,
    problems,
    submissions,
    users,
);
