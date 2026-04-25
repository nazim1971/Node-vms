--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzk8oe00002ofcdqp9emvo', 'Platform (System)', true, '2026-04-25 06:56:17.39', '2026-04-25 06:56:17.39', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzori3000a2ofcba5k6kgm', 'Sojib Rent A Car', true, '2026-04-25 06:59:48.411', '2026-04-25 07:13:02.827', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzod2100082ofcb3gfk1l7', 'Roni Rent A Car', true, '2026-04-25 06:59:29.689', '2026-04-25 07:13:19.18', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzny2v00062ofcz3qklfzi', 'Tom Rent A Car', true, '2026-04-25 06:59:10.279', '2026-04-25 07:13:29.839', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzm5v800042ofcyx0t0lxy', 'Saju Rent A Car', true, '2026-04-25 06:57:47.06', '2026-04-25 07:13:46.23', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzlf1p00022ofcjme7qeaw', 'Raju Rent A Car', true, '2026-04-25 06:57:12.301', '2026-04-25 07:13:58.041', NULL);
INSERT INTO public."Tenant" (id, name, "isActive", "createdAt", "updatedAt", "deletedAt") VALUES ('cmodzp7og000c2ofc2yp6fl77', 'Faysal Rent A Car', true, '2026-04-25 07:00:09.376', '2026-04-25 10:48:55.124', NULL);


--
-- Data for Name: Alert; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzp7oj000d2ofc4u6kp40x', 'cmodzp7og000c2ofc2yp6fl77', 'Faysal', 'faysal@gmail.com', '$2b$12$7mNJceJe2MfUfZ046runweg83h89a2KXOxAUODdNotL508yGGkUyy', 'ADMIN', true, '2026-04-25 07:00:09.376', '2026-04-25 10:48:55.111', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzk8om00012ofck7e2q8c9', 'cmodzk8oe00002ofcdqp9emvo', 'Platform Admin', 'nazim@gmail.com', '$2b$12$obTquXlPpWu/bCSC5o4SiuRvQrZ0tAwaJb5DPhtdj9reylQGZVBGe', 'SUPER_ADMIN', true, '2026-04-25 06:56:17.39', '2026-04-25 06:56:17.39', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzori7000b2ofc6yhegcw3', 'cmodzori3000a2ofcba5k6kgm', 'Sojib', 'sojib@gmail.com', '$2b$12$asPiDNvOT2DchpF9Z6BkU.L/jVFhdmWunzoBnaC6sk8IbhxhzdcA.', 'ADMIN', true, '2026-04-25 06:59:48.411', '2026-04-25 07:13:02.819', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzod2500092ofc02h4h4re', 'cmodzod2100082ofcb3gfk1l7', 'Roni', 'roni@gmail.com', '$2b$12$r4CncIginEn02fWcctOSEOgutDNniyL6TTFO9DjShCfkSeTGfyRBO', 'ADMIN', true, '2026-04-25 06:59:29.689', '2026-04-25 07:13:19.174', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzny2y00072ofcxox1bsf8', 'cmodzny2v00062ofcz3qklfzi', 'Tom', 'tom@gmail.com', '$2b$12$R9iV6eTg3EoJt9bjX3cCy.ndggKC/cQGFYD94pa714I35QobUHKFO', 'ADMIN', true, '2026-04-25 06:59:10.279', '2026-04-25 07:13:29.831', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzm5vc00052ofct0be85e3', 'cmodzm5v800042ofcyx0t0lxy', 'Saju', 'saju@gmail.com', '$2b$12$aRKKfVl9AFngIWzdOjmxiuGZmYmr8YDpujaB9egnyt2DcvVAmzJAO', 'ADMIN', true, '2026-04-25 06:57:47.06', '2026-04-25 07:13:46.221', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmodzlf1t00032ofccc9kl6fn', 'cmodzlf1p00022ofcjme7qeaw', 'Raju', 'raju@gmail.com', '$2b$12$1zzlcMnP7HKT9wArrVW28uo2IonZo6jx48E1p5kxUtiGA6FLzBSYO', 'ADMIN', true, '2026-04-25 06:57:12.301', '2026-04-25 07:13:58.034', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0efyr000q2ofc8h6mj9vc', 'cmodzp7og000c2ofc2yp6fl77', 'F1', 'f1@faysal.com', '$2b$12$hM2l9Z3GGFbQTjP53cCWTOMu5MHdjwxOR9ZuwtqKAf5c7/an0BCdi', 'DRIVER', true, '2026-04-25 07:19:46.515', '2026-04-25 07:19:46.515', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0f3x5000s2ofc5o5h1m9k', 'cmodzp7og000c2ofc2yp6fl77', 'F2', 'f2@faysal.com', '$2b$12$zAnJdUABSGp/OW7Elp06lO76u07iQVsoSFOhTzaZ.e/IT99pVadQC', 'EMPLOYEE', true, '2026-04-25 07:20:17.561', '2026-04-25 07:20:17.561', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0fg0h000u2ofcur66oxl6', 'cmodzp7og000c2ofc2yp6fl77', 'F3', 'f3@faysal.com', '$2b$12$56NCz42L7ywOGhiadwnwOuLbSUx4B9sheU6eWjywdUpRylRI40uqq', 'DRIVER', true, '2026-04-25 07:20:33.233', '2026-04-25 07:20:33.233', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0ftqp000w2ofcvvrfmhj8', 'cmodzp7og000c2ofc2yp6fl77', 'F4', 'f4@faysal.com', '$2b$12$Lb6r.Ipk/dROoYFil2Hqh..f0NffCa3BVYT.L6AKmhIslJdzLVATe', 'EMPLOYEE', true, '2026-04-25 07:20:51.025', '2026-04-25 07:20:51.025', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0g5xq000y2ofcomip9bfk', 'cmodzp7og000c2ofc2yp6fl77', 'F5', 'f5@faysal.com', '$2b$12$JBq.nVgf3X9ox2gF94ZEs.b3M4FBg5DzyoKQda248oz2Y1Jecy1KS', 'DRIVER', true, '2026-04-25 07:21:06.83', '2026-04-25 07:21:06.83', NULL, 'APPROVED', NULL);
INSERT INTO public."User" (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt", "deletedAt", "approvalStatus", "branchId") VALUES ('cmoe0he6400102ofcykb4wkmw', 'cmodzp7og000c2ofc2yp6fl77', 'F6', 'f6@faysal.com', '$2b$12$4xzIja28YvNWPlW6/2CN3eCGx24khg6vES5TOhiSuSTUmQ7EfHXiW', 'EMPLOYEE', true, '2026-04-25 07:22:04.156', '2026-04-25 07:22:04.156', NULL, 'APPROVED', NULL);


--
-- Data for Name: Driver; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Driver" (id, "tenantId", name, phone, "licenseNo", "isAvailable", "createdAt", "updatedAt", "deletedAt", "userId", "branchId") VALUES ('cmoe96j6p0000hkfc7ju4o5g6', 'cmodzp7og000c2ofc2yp6fl77', 'Md Nazim Uddin', '01867748073', 'DL-3434343434', true, '2026-04-25 11:25:33.985', '2026-04-25 11:25:33.985', NULL, NULL, NULL);


--
-- Data for Name: Vehicle; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Assignment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe00fiu000e2ofc9gaa6abq', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 07:08:52.758');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe01xod000f2ofcylve176a', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 07:10:02.941');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe02rfq000g2ofck22gc7q2', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 07:10:41.51');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe053h6000h2ofc2fbs19zu', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 07:12:30.426');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe058dk000i2ofcey356gjm', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 07:12:36.776');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe05shd000j2ofczddnpvu9', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzori7000b2ofc6yhegcw3', '2026-04-25 07:13:02.833');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0653o000k2ofchlsndv0s', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzod2500092ofc02h4h4re', '2026-04-25 07:13:19.188');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe06dbp000l2ofcc2mop8oq', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzny2y00072ofcxox1bsf8', '2026-04-25 07:13:29.845');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe06pz2000m2ofcfgng3jwq', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzm5vc00052ofct0be85e3', '2026-04-25 07:13:46.238');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe06z33000n2ofcpqcvmj04', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzlf1t00032ofccc9kl6fn', '2026-04-25 07:13:58.047');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0a35r000p2ofcia6nwj8l', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'POST', 'users', 'cmoe0a35a000o2ofc1ffcyl9d', '2026-04-25 07:16:23.295');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0efz8000r2ofc1x2rnkdm', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0efyr000q2ofc8h6mj9vc', '2026-04-25 07:19:46.532');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0f3xi000t2ofc3rwxa866', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0f3x5000s2ofc5o5h1m9k', '2026-04-25 07:20:17.574');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0fg0t000v2ofcyf8dvdh0', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0fg0h000u2ofcur66oxl6', '2026-04-25 07:20:33.245');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0ftr3000x2ofc208j3884', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0ftqp000w2ofcvvrfmhj8', '2026-04-25 07:20:51.039');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0g5y4000z2ofcscurhfhg', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0g5xq000y2ofcomip9bfk', '2026-04-25 07:21:06.844');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe0he6j00112ofc34gj5o3u', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'users', 'cmoe0he6400102ofcykb4wkmw', '2026-04-25 07:22:04.171');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe7qd46000100fcwd2bcrdx', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'feature-access', 'cmoe7qd35000000fc98274aj5', '2026-04-25 10:45:00.006');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe7qf2w000200fc0of58khv', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'feature-access', 'cmoe7qd35000000fc98274aj5', '2026-04-25 10:45:02.552');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe7v3tp000300fckeqm4vec', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 10:48:41.245');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe7vejp000400fcjdl0djdo', 'cmodzk8oe00002ofcdqp9emvo', 'cmodzk8om00012ofck7e2q8c9', 'PATCH', 'admin-applications', 'cmodzp7oj000d2ofc4u6kp40x', '2026-04-25 10:48:55.141');
INSERT INTO public."AuditLog" (id, "tenantId", "userId", action, entity, "entityId", "createdAt") VALUES ('cmoe96j7q0001hkfc2mei86y1', 'cmodzp7og000c2ofc2yp6fl77', 'cmodzp7oj000d2ofc4u6kp40x', 'POST', 'drivers', 'cmoe96j6p0000hkfc7ju4o5g6', '2026-04-25 11:25:34.022');


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: FeatureAccess; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."FeatureAccess" (id, "tenantId", "moduleName", "isEnabled", "createdAt", "updatedAt", "deletedAt") VALUES ('cmoe7qd35000000fc98274aj5', 'cmodzk8oe00002ofcdqp9emvo', 'vehicles', true, '2026-04-25 10:44:59.969', '2026-04-25 10:45:02.541', NULL);


--
-- Data for Name: FuelLog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: GpsLocation; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Income; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: MaintenanceLog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: MaintenanceItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Trip; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: WorkshopJob; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: WorkshopItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

