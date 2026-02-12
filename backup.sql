--
-- PostgreSQL database dump
--

\restrict X4KZSIecztoqx5gtlIFxYJTLSMRiLu81hN58BbBq9LBTd5GeiDiZZvGovtiEuO5

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: opname_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opname_records (
    id integer NOT NULL,
    session_id integer NOT NULL,
    product_id integer NOT NULL,
    actual_stock integer,
    notes text,
    photo_url text
);


ALTER TABLE public.opname_records OWNER TO postgres;

--
-- Name: opname_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opname_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opname_records_id_seq OWNER TO postgres;

--
-- Name: opname_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opname_records_id_seq OWNED BY public.opname_records.id;


--
-- Name: opname_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opname_sessions (
    id integer NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    notes text,
    user_id text NOT NULL
);


ALTER TABLE public.opname_sessions OWNER TO postgres;

--
-- Name: opname_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opname_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opname_sessions_id_seq OWNER TO postgres;

--
-- Name: opname_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opname_sessions_id_seq OWNED BY public.opname_sessions.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    current_stock integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    photo_url text,
    user_id text NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'stock_counter'::text NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying NOT NULL,
    password character varying NOT NULL,
    admin_id character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: opname_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_records ALTER COLUMN id SET DEFAULT nextval('public.opname_records_id_seq'::regclass);


--
-- Name: opname_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_sessions ALTER COLUMN id SET DEFAULT nextval('public.opname_sessions_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Data for Name: opname_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opname_records (id, session_id, product_id, actual_stock, notes, photo_url) FROM stdin;
12	3	11	\N	\N	\N
13	4	12	\N	\N	/uploads/FotoItemSO_20260211.png
14	5	13	\N	\N	\N
\.


--
-- Data for Name: opname_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opname_sessions (id, title, status, started_at, completed_at, notes, user_id) FROM stdin;
3	Test Session Photo	in_progress	2026-02-11 11:09:52.844854	\N		06dfa432-a029-47e9-aca8-2ede2268f2d8
4	Foto Test Session	in_progress	2026-02-11 11:12:50.437891	\N		b161fb8e-a4ab-4f56-beb1-95d6592f3820
5	Foto Upload Test cL1k	in_progress	2026-02-11 11:28:27.588739	\N	test	ec623377-e572-46de-a2cb-002778102112
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, sku, name, category, description, current_stock, updated_at, photo_url, user_id) FROM stdin;
10	TEST-001	Updated Product	Elektronik		75	2026-02-11 10:52:47.842124	\N	fb682e48-252d-4019-8c09-a465e39c484b
11	PHOTO-CODt	TestProduct	Elektronik		10	2026-02-11 11:09:21.315653	\N	06dfa432-a029-47e9-aca8-2ede2268f2d8
12	FT-7SnT	FotoItem	Makanan		5	2026-02-11 11:12:09.128337	\N	b161fb8e-a4ab-4f56-beb1-95d6592f3820
13	SKU-PT5QOu	TestFotoProduct	General	\N	10	2026-02-11 11:28:12.669252	\N	ec623377-e572-46de-a2cb-002778102112
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
dLfv6-FIhdx758MTsAPNxIJUOYLwF9-T	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-18T11:28:05.610Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "ec623377-e572-46de-a2cb-002778102112"}	2026-02-18 11:29:04
1oLFutu4l-2aMW7njhIVrBvPxblbvyYc	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-18T11:08:54.646Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "06dfa432-a029-47e9-aca8-2ede2268f2d8"}	2026-02-18 11:10:15
JLvFZcxQcp494XAp_yKjTYdZYeKozCxS	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-18T11:11:41.906Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "b161fb8e-a4ab-4f56-beb1-95d6592f3820"}	2026-02-18 11:13:10
g14kIZ7A2I6gTJa4ljFaMS7ZJ-OFg9IX	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T10:01:21.006Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "5HvHj3DKi2v6x1vhgBn7_Gojy959Z8fPm4xf3lxoXV4"}}	2026-02-19 08:22:47
kZryco6lhzcWVs46NHSGwwaDHhXAPbZ_	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-18T10:54:15.222Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "5a55807f-ba5a-4b97-a7a8-ddf17d6eedd4"}	2026-02-18 10:54:21
_6p33oMFvrokrpQLw-h4lf4Vr89G2BS5	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T10:09:57.943Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8a23b09e-55a3-4e76-a048-be9216afd0d5", "exp": 1770808197, "iat": 1770804597, "iss": "https://test-mock-oidc.replit.app/", "jti": "f952a87c9cc2f1d337473e96051e5e9e", "sub": "exceltest2-PS_m_p", "email": "exceltest2sJKjul@example.com", "auth_time": 1770804597, "last_name": "Manager", "first_name": "Excel"}, "expires_at": 1770808197, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcwODA0NTk3LCJleHAiOjE3NzA4MDgxOTcsInN1YiI6ImV4Y2VsdGVzdDItUFNfbV9wIiwiZW1haWwiOiJleGNlbHRlc3Qyc0pLanVsQGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IkV4Y2VsIiwibGFzdF9uYW1lIjoiTWFuYWdlciJ9.Xd0Fp2SYdRreggUcUy8LPaXpMiVu0e4Fjqniv6aq5JXYSnZuiiaiKnKiztsY7gC4OLJjCZEML0Urcvcao3ILkOXCuio1jHatTHhPMIZoWVh3RwURei7vOrfKaf5Nj0VDRPOUYm_icH34HxWhaV8j892fSb0XvVehT7mjUIAKwsnQRvQ7M4exNPZaiF2dAIDnh1HbVlYq7ODcoG6ZX12V61byhgx1iAryqwHq3PjiP8HmShDQPXq2mhLcNbLencK3r8DiA8TK-7SDdtX2sMr0Tw1SSBXKlsMERoz7oVC6zBacU3vFSR7qkiNS_eq_uYJRxS8euYIBwDAZHVyT1KR9Gg", "refresh_token": "eyJzdWIiOiJleGNlbHRlc3QyLVBTX21fcCIsImVtYWlsIjoiZXhjZWx0ZXN0MnNKS2p1bEBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJFeGNlbCIsImxhc3RfbmFtZSI6Ik1hbmFnZXIifQ"}}}	2026-02-18 10:11:05
PIu4-ROBy5gzpB-dVcQaFcjGAqkSii14	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-18T11:43:14.171Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "e40262c4-1149-471b-a77a-c4f7dcca5fb1"}	2026-02-18 11:43:15
6K2Xsb_IuAjJGd49dsIfhrbGAtGluvIx	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T10:05:32.006Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8a23b09e-55a3-4e76-a048-be9216afd0d5", "exp": 1770807931, "iat": 1770804331, "iss": "https://test-mock-oidc.replit.app/", "jti": "c3405ece31892710a2e9369a5e68c2e7", "sub": "excel-test-jCGL2L", "email": "exceltestI6fIOB@example.com", "auth_time": 1770804331, "last_name": "Tester", "first_name": "Excel"}, "expires_at": 1770807931, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcwODA0MzMxLCJleHAiOjE3NzA4MDc5MzEsInN1YiI6ImV4Y2VsLXRlc3QtakNHTDJMIiwiZW1haWwiOiJleGNlbHRlc3RJNmZJT0JAZXhhbXBsZS5jb20iLCJmaXJzdF9uYW1lIjoiRXhjZWwiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ.oVxbE_ePu6wXw6vPwRB-3XSmJ91bigRONqbxetg7xKCdOgXFk8UzdBP880XUyzMGAqqbtJwhq7GaPVVbd3JQSJdVW2GpHf5s-vlSwBvloBeR51wfwLmNQ7mYFPvbWi5Gy9JflquFopepsRYTftip5dG2mTY8ryO0nhKMSSqMnKoSZkHxND5LY-JADAyc5k5-8TpttmgVUhSQygTgD_NGGS2N2DkcO7oRzaCsh6c9vTxOvahfAZNb1M8j-EpP3w5B8fkZLCIpFgiFRO_rLLbrZm0UpWJPUS9miucyFIH1jHM955G-msd_sfoYN-G7zT0kK2ZBDN7d-rIFKfh4spbG0A", "refresh_token": "eyJzdWIiOiJleGNlbC10ZXN0LWpDR0wyTCIsImVtYWlsIjoiZXhjZWx0ZXN0STZmSU9CQGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IkV4Y2VsIiwibGFzdF9uYW1lIjoiVGVzdGVyIn0"}}}	2026-02-18 10:06:45
UnAIdGiOXCz0k6RAPb2KAJtijwO2tAs8	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T10:07:54.761Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8a23b09e-55a3-4e76-a048-be9216afd0d5", "exp": 1770808074, "iat": 1770804474, "iss": "https://test-mock-oidc.replit.app/", "jti": "4c2aa0e7e30050c66ab102e0bd79c2ba", "sub": "exceltest-cIlqbn", "email": "exceltest4PTtVx@example.com", "auth_time": 1770804474, "last_name": "Tester", "first_name": "Excel"}, "expires_at": 1770808074, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcwODA0NDc0LCJleHAiOjE3NzA4MDgwNzQsInN1YiI6ImV4Y2VsdGVzdC1jSWxxYm4iLCJlbWFpbCI6ImV4Y2VsdGVzdDRQVHRWeEBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJFeGNlbCIsImxhc3RfbmFtZSI6IlRlc3RlciJ9.WwE--nNOIZgcsNUeX8vl23cY6anmKYZvFRCVmaiyGb1bwyKpP2jBdXrpT5ofEwUN7NQHo881-u2RucGSSim_efWJDCw1AW9x19l57MJxYTTt_R26vuS2ZND5WnYMur1iNbpN6o3EXxRVjV2_u9CfoEq346AbuJ-3INGZUGS4ITEb7aYm4Dikx4hhE5ACMSLZ_EWsHlZ6maUlylA0jFzB-xEsMVJNGHGFFHS8PHMTmnB1q49tOPI0iLPTNMvZGi5VgJidnQcJKdfP7FhIFwTfAa6tlWKXJd1rDIzEQ0iZQUVlKuZ9ffkD527bS1FiFS-qtULJJ3EvKbm0T98MUaQMDA", "refresh_token": "eyJzdWIiOiJleGNlbHRlc3QtY0lscWJuIiwiZW1haWwiOiJleGNlbHRlc3Q0UFR0VnhAZXhhbXBsZS5jb20iLCJmaXJzdF9uYW1lIjoiRXhjZWwiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ"}}}	2026-02-18 10:08:29
Xh0onx6sXJGns0s27VNqfPli5Cfrd1fc	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T09:51:26.681Z", "httpOnly": true, "originalMaxAge": 604800000}}	2026-02-18 09:51:28
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role) FROM stdin;
5	f7d0d722-9673-4838-8932-3d552d7ca1ec	admin
6	4051abec-1dbd-467c-a915-afa73ffae97a	stock_counter
7	fb682e48-252d-4019-8c09-a465e39c484b	admin
8	5a55807f-ba5a-4b97-a7a8-ddf17d6eedd4	stock_counter
9	06dfa432-a029-47e9-aca8-2ede2268f2d8	admin
10	b161fb8e-a4ab-4f56-beb1-95d6592f3820	admin
11	ec623377-e572-46de-a2cb-002778102112	admin
12	01f5e05f-f474-448a-876c-2c506b80923c	admin
13	0cd0fdac-b8a9-47d0-aa9b-502e3cd299c9	admin
14	e40262c4-1149-471b-a77a-c4f7dcca5fb1	stock_counter
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, username, password, admin_id) FROM stdin;
f7d0d722-9673-4838-8932-3d552d7ca1ec	\N	Test	Admin	\N	2026-02-11 10:23:10.002459	2026-02-11 10:23:10.002459	testadmin_LiAKsf	$2b$10$sSMk/mp8yVlxr0GqDOXfreErDn7Cwqmnn5tu6EC83rP5twn9cc2wa	\N
4051abec-1dbd-467c-a915-afa73ffae97a	\N	Counter	User	\N	2026-02-11 10:23:44.406152	2026-02-11 10:23:44.406152	counter_HhBXx-	$2b$10$XIbX0i8Hr784FQ75cX..KOrtv4LSsPyY3TXZYn2p4jpX9XvNnCT3O	\N
5a55807f-ba5a-4b97-a7a8-ddf17d6eedd4	\N	Counter	User	\N	2026-02-11 10:53:39.803211	2026-02-11 10:53:39.803211	counter_33TAIT	$2b$10$LE9XO9T3igTmOlJTVOysv.vjvde6wGWd3.wfq9YzWD8UxGpMQY4C.	fb682e48-252d-4019-8c09-a465e39c484b
fb682e48-252d-4019-8c09-a465e39c484b	\N	SuperAdmin	Test	\N	2026-02-11 10:52:18.72587	2026-02-11 10:53:59.49	admin_MjIR9r	$2b$10$Y1lYpvicJTiZHNUXV8MwCu/YzrOAghzHH5/vm49MnVdQCvXrjvym6	\N
06dfa432-a029-47e9-aca8-2ede2268f2d8	\N	TestPhoto	Admin	\N	2026-02-11 11:08:54.639208	2026-02-11 11:08:54.639208	photoadmin_twX0po	$2b$10$4duH7KXnnYf0f1OG5g13K.dCLRkN8IY8k.zG8oMbV.NW8BexZ7IJ2	\N
b161fb8e-a4ab-4f56-beb1-95d6592f3820	\N	FotoTest	User	\N	2026-02-11 11:11:41.895209	2026-02-11 11:11:41.895209	fototest_BQvFpt	$2b$10$Li6rsdXvvgjRoDpHKuT6oOKw9olej4wnSXp9OxoM10bXWxaFr8zoi	\N
ec623377-e572-46de-a2cb-002778102112	\N	Foto	Tester	\N	2026-02-11 11:28:05.599243	2026-02-11 11:28:05.599243	fototest_zRGXON	$2b$10$iB8dmFUezLIVlHdbuf199OlOZ2lJmN1iGQAL1r2NlwpCfIu2sRZUG	\N
01f5e05f-f474-448a-876c-2c506b80923c	\N	Reset	Admin	\N	2026-02-11 11:41:08.783111	2026-02-11 11:41:08.783111	resetadmin_5Un2sk	$2b$10$8YjOKs1nvVbkBGYg3VJ05uHpEMCpwRHFWYpPvXr1zbXk/EdYWY0Xi	\N
0cd0fdac-b8a9-47d0-aa9b-502e3cd299c9	\N	Reset	Admin	\N	2026-02-11 11:41:28.086381	2026-02-11 11:41:28.086381	resetadmin_WJw0MT	$2b$10$l/94oRJw19X9qG5TuFBuKOJojSaVd5fKt228NnBuUSI9Ffwvl1xke	\N
e40262c4-1149-471b-a77a-c4f7dcca5fb1	\N	Sub	User	\N	2026-02-11 11:42:14.718471	2026-02-11 11:42:50.47	subuser_nanAqR	$2b$10$fEF8tBG/HxnOTapfSIBwQuS0vrce7fiHNd97oehY9rN2R6lO4Cjse	0cd0fdac-b8a9-47d0-aa9b-502e3cd299c9
\.


--
-- Name: opname_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opname_records_id_seq', 14, true);


--
-- Name: opname_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opname_sessions_id_seq', 5, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 13, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 14, true);


--
-- Name: opname_records opname_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_records
    ADD CONSTRAINT opname_records_pkey PRIMARY KEY (id);


--
-- Name: opname_sessions opname_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_sessions
    ADD CONSTRAINT opname_sessions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: opname_records opname_records_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_records
    ADD CONSTRAINT opname_records_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: opname_records opname_records_session_id_opname_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opname_records
    ADD CONSTRAINT opname_records_session_id_opname_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.opname_sessions(id);


--
-- PostgreSQL database dump complete
--

\unrestrict X4KZSIecztoqx5gtlIFxYJTLSMRiLu81hN58BbBq9LBTd5GeiDiZZvGovtiEuO5

