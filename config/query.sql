table users
    id integer autoincrement (PK)
    email character varying(100) not null unique
    password character varying(100) not null
    avatar text

table todos
    id integer autoincrement(PK)
    title character varying(100) not null
    complete boolean default false
    deadline timestamp default value(today + 1 day)
    userid integer not null (FK)