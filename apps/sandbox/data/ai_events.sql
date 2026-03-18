-- RealityDB AI Event Stream Template | Seed: 42 | ~200 rows
-- Lifecycle: dismissed model_alerts → resolved_at = NULL
-- Temporal: resolved_at > created_at, inference latency bounded
-- Weights: segment power_user=15% regular=55% casual=25% churned=5% | event_type page_view=35% click=25% search=20% purchase=10% signup=5% share=5%

CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT NOT NULL, email TEXT NOT NULL, segment TEXT NOT NULL, platform TEXT NOT NULL, country TEXT NOT NULL, created_at TIMESTAMP NOT NULL);
CREATE TABLE events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), event_type TEXT NOT NULL, page TEXT, metadata TEXT, session_id TEXT NOT NULL, created_at TIMESTAMP NOT NULL);
CREATE TABLE inference_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), model TEXT NOT NULL, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, latency_ms NUMERIC(8,1) NOT NULL, status TEXT NOT NULL, error_message TEXT, created_at TIMESTAMP NOT NULL);
CREATE TABLE model_alerts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), model TEXT NOT NULL, severity TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, description TEXT, metric_value NUMERIC(10,4), threshold NUMERIC(10,4), resolved_at TIMESTAMP, created_at TIMESTAMP NOT NULL);

INSERT INTO users VALUES
('au100001-0000-0000-0000-000000000001','alex_dev','alex.d@email.com','power_user','web','US','2024-01-05 08:00:00'),
('au100001-0000-0000-0000-000000000002','priya_ml','priya.m@email.com','power_user','web','IN','2024-01-10 09:00:00'),
('au100001-0000-0000-0000-000000000003','chen_wei','chen.w@email.com','regular','mobile','CN','2024-01-20 10:00:00'),
('au100001-0000-0000-0000-000000000004','maria_g','maria.g@email.com','regular','web','BR','2024-02-01 08:30:00'),
('au100001-0000-0000-0000-000000000005','james_t','james.t@email.com','regular','desktop','US','2024-02-15 14:00:00'),
('au100001-0000-0000-0000-000000000006','yuki_s','yuki.s@email.com','regular','mobile','JP','2024-03-01 09:00:00'),
('au100001-0000-0000-0000-000000000007','fatima_k','fatima.k@email.com','casual','web','AE','2024-03-15 11:00:00'),
('au100001-0000-0000-0000-000000000008','oliver_b','oliver.b@email.com','casual','web','UK','2024-04-01 10:00:00'),
('au100001-0000-0000-0000-000000000009','sophie_m','sophie.m@email.com','regular','desktop','FR','2024-04-15 08:00:00'),
('au100001-0000-0000-0000-000000000010','carlos_r','carlos.r@email.com','regular','mobile','MX','2024-05-01 09:30:00'),
('au100001-0000-0000-0000-000000000011','anna_k','anna.k@email.com','casual','web','DE','2024-05-15 12:00:00'),
('au100001-0000-0000-0000-000000000012','raj_p','raj.p@email.com','power_user','web','IN','2024-06-01 08:00:00'),
('au100001-0000-0000-0000-000000000013','lisa_w','lisa.w@email.com','regular','desktop','US','2024-06-15 10:00:00'),
('au100001-0000-0000-0000-000000000014','tom_h','tom.h@email.com','churned','web','AU','2024-07-01 09:00:00'),
('au100001-0000-0000-0000-000000000015','nina_v','nina.v@email.com','regular','mobile','RU','2024-07-15 11:00:00'),
('au100001-0000-0000-0000-000000000016','david_l','david.l@email.com','casual','web','CA','2024-08-01 08:00:00'),
('au100001-0000-0000-0000-000000000017','emma_n','emma.n@email.com','regular','web','SE','2024-08-15 10:00:00'),
('au100001-0000-0000-0000-000000000018','kwame_a','kwame.a@email.com','regular','mobile','GH','2024-09-01 09:00:00'),
('au100001-0000-0000-0000-000000000019','sarah_c','sarah.c@email.com','churned','desktop','US','2024-09-15 14:00:00'),
('au100001-0000-0000-0000-000000000020','hassan_m','hassan.m@email.com','regular','web','EG','2024-10-01 08:00:00');

INSERT INTO events VALUES
('ev200001-0000-0000-0000-000000000001','au100001-0000-0000-0000-000000000001','page_view','/dashboard','{"ref":"direct"}','sess-001','2025-03-15 09:00:00'),
('ev200001-0000-0000-0000-000000000002','au100001-0000-0000-0000-000000000001','click','/dashboard','{"element":"run_model"}','sess-001','2025-03-15 09:02:00'),
('ev200001-0000-0000-0000-000000000003','au100001-0000-0000-0000-000000000001','search','/models','{"query":"sentiment analysis"}','sess-001','2025-03-15 09:05:00'),
('ev200001-0000-0000-0000-000000000004','au100001-0000-0000-0000-000000000002','page_view','/playground','{"ref":"bookmark"}','sess-002','2025-03-15 08:30:00'),
('ev200001-0000-0000-0000-000000000005','au100001-0000-0000-0000-000000000002','click','/playground','{"element":"deploy_btn"}','sess-002','2025-03-15 08:45:00'),
('ev200001-0000-0000-0000-000000000006','au100001-0000-0000-0000-000000000002','purchase','/billing','{"plan":"pro","amount":29}','sess-002','2025-03-15 08:50:00'),
('ev200001-0000-0000-0000-000000000007','au100001-0000-0000-0000-000000000003','page_view','/home','{"ref":"google"}','sess-003','2025-03-14 10:00:00'),
('ev200001-0000-0000-0000-000000000008','au100001-0000-0000-0000-000000000003','search','/models','{"query":"image classification"}','sess-003','2025-03-14 10:05:00'),
('ev200001-0000-0000-0000-000000000009','au100001-0000-0000-0000-000000000003','click','/models/resnet50','{"element":"try_it"}','sess-003','2025-03-14 10:08:00'),
('ev200001-0000-0000-0000-000000000010','au100001-0000-0000-0000-000000000004','page_view','/docs','{"ref":"twitter"}','sess-004','2025-03-14 08:30:00'),
('ev200001-0000-0000-0000-000000000011','au100001-0000-0000-0000-000000000004','page_view','/docs/api-reference','{"ref":"internal"}','sess-004','2025-03-14 08:35:00'),
('ev200001-0000-0000-0000-000000000012','au100001-0000-0000-0000-000000000005','page_view','/dashboard','{"ref":"email"}','sess-005','2025-03-13 14:00:00'),
('ev200001-0000-0000-0000-000000000013','au100001-0000-0000-0000-000000000005','click','/dashboard','{"element":"usage_chart"}','sess-005','2025-03-13 14:10:00'),
('ev200001-0000-0000-0000-000000000014','au100001-0000-0000-0000-000000000006','page_view','/home','{"ref":"google"}','sess-006','2025-03-13 09:00:00'),
('ev200001-0000-0000-0000-000000000015','au100001-0000-0000-0000-000000000006','signup','/register','{"method":"google_oauth"}','sess-006','2025-03-13 09:05:00'),
('ev200001-0000-0000-0000-000000000016','au100001-0000-0000-0000-000000000007','page_view','/pricing','{"ref":"google"}','sess-007','2025-03-12 11:00:00'),
('ev200001-0000-0000-0000-000000000017','au100001-0000-0000-0000-000000000008','page_view','/blog','{"ref":"hackernews"}','sess-008','2025-03-12 10:00:00'),
('ev200001-0000-0000-0000-000000000018','au100001-0000-0000-0000-000000000008','share','/blog/intro-to-ml','{"platform":"twitter"}','sess-008','2025-03-12 10:15:00'),
('ev200001-0000-0000-0000-000000000019','au100001-0000-0000-0000-000000000009','page_view','/playground','{"ref":"direct"}','sess-009','2025-03-12 08:00:00'),
('ev200001-0000-0000-0000-000000000020','au100001-0000-0000-0000-000000000009','search','/models','{"query":"text generation"}','sess-009','2025-03-12 08:10:00'),
('ev200001-0000-0000-0000-000000000021','au100001-0000-0000-0000-000000000010','page_view','/home','{"ref":"reddit"}','sess-010','2025-03-11 09:30:00'),
('ev200001-0000-0000-0000-000000000022','au100001-0000-0000-0000-000000000010','click','/home','{"element":"cta_button"}','sess-010','2025-03-11 09:35:00'),
('ev200001-0000-0000-0000-000000000023','au100001-0000-0000-0000-000000000011','page_view','/pricing','{"ref":"google"}','sess-011','2025-03-10 12:00:00'),
('ev200001-0000-0000-0000-000000000024','au100001-0000-0000-0000-000000000012','page_view','/dashboard','{"ref":"direct"}','sess-012','2025-03-15 08:00:00'),
('ev200001-0000-0000-0000-000000000025','au100001-0000-0000-0000-000000000012','click','/dashboard','{"element":"new_project"}','sess-012','2025-03-15 08:05:00'),
('ev200001-0000-0000-0000-000000000026','au100001-0000-0000-0000-000000000012','search','/models','{"query":"fine tune llama"}','sess-012','2025-03-15 08:12:00'),
('ev200001-0000-0000-0000-000000000027','au100001-0000-0000-0000-000000000012','purchase','/billing','{"plan":"enterprise","amount":299}','sess-012','2025-03-15 08:30:00'),
('ev200001-0000-0000-0000-000000000028','au100001-0000-0000-0000-000000000013','page_view','/docs/quickstart','{"ref":"email"}','sess-013','2025-03-10 10:00:00'),
('ev200001-0000-0000-0000-000000000029','au100001-0000-0000-0000-000000000015','page_view','/dashboard','{"ref":"direct"}','sess-015','2025-03-11 11:00:00'),
('ev200001-0000-0000-0000-000000000030','au100001-0000-0000-0000-000000000015','click','/dashboard','{"element":"api_keys"}','sess-015','2025-03-11 11:05:00'),
('ev200001-0000-0000-0000-000000000031','au100001-0000-0000-0000-000000000017','page_view','/playground','{"ref":"direct"}','sess-017','2025-03-13 10:00:00'),
('ev200001-0000-0000-0000-000000000032','au100001-0000-0000-0000-000000000017','search','/models','{"query":"swedish translation"}','sess-017','2025-03-13 10:10:00'),
('ev200001-0000-0000-0000-000000000033','au100001-0000-0000-0000-000000000018','page_view','/home','{"ref":"twitter"}','sess-018','2025-03-12 09:00:00'),
('ev200001-0000-0000-0000-000000000034','au100001-0000-0000-0000-000000000018','signup','/register','{"method":"email"}','sess-018','2025-03-12 09:08:00'),
('ev200001-0000-0000-0000-000000000035','au100001-0000-0000-0000-000000000020','page_view','/dashboard','{"ref":"direct"}','sess-020','2025-03-14 08:00:00');

INSERT INTO inference_logs VALUES
('il300001-0000-0000-0000-000000000001','au100001-0000-0000-0000-000000000001','gpt-4o',1250,480,1823.5,'success',NULL,'2025-03-15 09:03:00'),
('il300001-0000-0000-0000-000000000002','au100001-0000-0000-0000-000000000001','claude-sonnet',890,320,1245.2,'success',NULL,'2025-03-15 09:06:00'),
('il300001-0000-0000-0000-000000000003','au100001-0000-0000-0000-000000000002','llama-3-70b',2100,750,3450.8,'success',NULL,'2025-03-15 08:46:00'),
('il300001-0000-0000-0000-000000000004','au100001-0000-0000-0000-000000000002','gpt-4o',500,200,890.3,'success',NULL,'2025-03-15 08:52:00'),
('il300001-0000-0000-0000-000000000005','au100001-0000-0000-0000-000000000003','resnet-50',0,0,145.6,'success',NULL,'2025-03-14 10:09:00'),
('il300001-0000-0000-0000-000000000006','au100001-0000-0000-0000-000000000005','claude-sonnet',650,280,1100.4,'success',NULL,'2025-03-13 14:12:00'),
('il300001-0000-0000-0000-000000000007','au100001-0000-0000-0000-000000000009','gpt-4o',1800,600,2100.0,'success',NULL,'2025-03-12 08:12:00'),
('il300001-0000-0000-0000-000000000008','au100001-0000-0000-0000-000000000009','gpt-4o',3200,0,5200.0,'error','Context length exceeded','2025-03-12 08:15:00'),
('il300001-0000-0000-0000-000000000009','au100001-0000-0000-0000-000000000012','llama-3-70b',4500,1200,6800.5,'success',NULL,'2025-03-15 08:15:00'),
('il300001-0000-0000-0000-000000000010','au100001-0000-0000-0000-000000000012','llama-3-70b',800,350,1450.2,'success',NULL,'2025-03-15 08:20:00'),
('il300001-0000-0000-0000-000000000011','au100001-0000-0000-0000-000000000012','claude-sonnet',1500,500,1890.7,'success',NULL,'2025-03-15 08:25:00'),
('il300001-0000-0000-0000-000000000012','au100001-0000-0000-0000-000000000001','whisper-v3',0,0,2340.1,'success',NULL,'2025-03-15 09:10:00'),
('il300001-0000-0000-0000-000000000013','au100001-0000-0000-0000-000000000013','gpt-4o',400,150,780.5,'success',NULL,'2025-03-10 10:05:00'),
('il300001-0000-0000-0000-000000000014','au100001-0000-0000-0000-000000000015','claude-sonnet',1100,400,1560.3,'success',NULL,'2025-03-11 11:08:00'),
('il300001-0000-0000-0000-000000000015','au100001-0000-0000-0000-000000000015','claude-sonnet',950,0,15200.0,'error','Request timeout','2025-03-11 11:12:00'),
('il300001-0000-0000-0000-000000000016','au100001-0000-0000-0000-000000000017','nllb-200',300,280,420.8,'success',NULL,'2025-03-13 10:12:00'),
('il300001-0000-0000-0000-000000000017','au100001-0000-0000-0000-000000000020','gpt-4o',700,250,980.4,'success',NULL,'2025-03-14 08:05:00'),
('il300001-0000-0000-0000-000000000018','au100001-0000-0000-0000-000000000001','gpt-4o',2200,800,2890.6,'success',NULL,'2025-03-14 14:00:00'),
('il300001-0000-0000-0000-000000000019','au100001-0000-0000-0000-000000000002','llama-3-70b',6000,0,1200.0,'error','GPU OOM','2025-03-14 16:00:00'),
('il300001-0000-0000-0000-000000000020','au100001-0000-0000-0000-000000000004','claude-sonnet',550,200,920.1,'success',NULL,'2025-03-14 08:40:00');

INSERT INTO model_alerts VALUES
('ma400001-0000-0000-0000-000000000001','gpt-4o','medium','latency_spike','resolved','P95 latency exceeded 3000ms for 15 minutes',3240.5000,3000.0000,'2025-03-15 10:00:00','2025-03-15 09:30:00'),
('ma400001-0000-0000-0000-000000000002','llama-3-70b','critical','error_rate','resolved','Error rate exceeded 5% threshold — GPU OOM on batch inference',7.2000,5.0000,'2025-03-14 18:00:00','2025-03-14 16:05:00'),
('ma400001-0000-0000-0000-000000000003','claude-sonnet','high','timeout_rate','investigating','Timeout rate spiked to 4.2% during peak hours',4.2000,2.0000,NULL,'2025-03-11 11:15:00'),
('ma400001-0000-0000-0000-000000000004','resnet-50','low','drift_detected','dismissed','Minor input distribution shift detected — cosine similarity 0.92',0.9200,0.9500,NULL,'2025-03-14 10:15:00'),
('ma400001-0000-0000-0000-000000000005','whisper-v3','low','latency_spike','resolved','P95 latency exceeded 2500ms briefly during audio batch',2680.0000,2500.0000,'2025-03-15 09:20:00','2025-03-15 09:12:00'),
('ma400001-0000-0000-0000-000000000006','gpt-4o','medium','cost_anomaly','investigating','Daily cost 42% above 7-day rolling average',1842.5000,1300.0000,NULL,'2025-03-15 08:00:00'),
('ma400001-0000-0000-0000-000000000007','llama-3-70b','high','availability','resolved','Model endpoint returned 503 for 8 minutes during deployment',0.0000,99.9000,'2025-03-13 04:00:00','2025-03-13 03:45:00'),
('ma400001-0000-0000-0000-000000000008','nllb-200','low','quality_degradation','dismissed','BLEU score dropped 1.2 points on Swedish translation benchmark',38.4000,39.0000,NULL,'2025-03-13 10:20:00');
