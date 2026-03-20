#!/usr/bin/env python3
"""Generate enriched ai-events.sql"""
import random
from datetime import datetime, timedelta
random.seed(42)

out = []

out.append("""-- AI/ML events platform schema and sample data
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  framework VARCHAR(100) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  parameters_millions NUMERIC(10,1) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id),
  name VARCHAR(255) NOT NULL,
  dataset VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  accuracy NUMERIC(5,4),
  loss NUMERIC(8,6),
  epochs INTEGER NOT NULL,
  learning_rate NUMERIC(10,8) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id),
  environment VARCHAR(50) NOT NULL,
  endpoint_url VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  requests_per_day INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(8,2) NOT NULL,
  deployed_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  event_type VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  latency_ms NUMERIC(8,2) NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);""")

def uid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"

def esc(s):
    return s.replace("'", "''")

def fmt_ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')

base_date = datetime(2023, 6, 1)
end_date = datetime(2026, 2, 28)
total_days = (end_date - base_date).days

def random_date():
    if random.random() < 0.6:
        d = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 365))
        if d > end_date:
            d = end_date - timedelta(days=random.randint(0, 60))
        return d
    return base_date + timedelta(days=random.randint(0, total_days))

# Models (15)
models_data = [
    (1, 'fraud_detector_v3', 'v3.2.1', 'scikit-learn', 'anomaly_detection', 0.5, 'active', '2023-06-15 10:00:00'),
    (2, 'churn_predictor', 'v2.1.0', 'XGBoost', 'classification', 2.3, 'active', '2023-08-01 09:00:00'),
    (3, 'recommendation_engine', 'v4.0.2', 'PyTorch', 'recommendation', 450.0, 'active', '2023-09-15 11:00:00'),
    (4, 'sentiment_analyzer', 'v2.3.1', 'TensorFlow', 'sentiment_analysis', 110.0, 'active', '2023-11-01 08:00:00'),
    (5, 'image_classifier', 'v1.8.0', 'TensorFlow', 'image_classification', 350.0, 'active', '2024-01-10 09:00:00'),
    (6, 'text_summarizer', 'v3.1.0', 'PyTorch', 'summarization', 7000.0, 'active', '2024-03-01 10:00:00'),
    (7, 'anomaly_detector', 'v1.5.3', 'scikit-learn', 'anomaly_detection', 1.2, 'active', '2024-04-15 08:00:00'),
    (8, 'demand_forecaster', 'v2.0.0', 'TensorFlow', 'forecasting', 85.0, 'active', '2024-06-01 09:00:00'),
    (9, 'customer_segmentation', 'v1.2.0', 'scikit-learn', 'segmentation', 0.8, 'active', '2024-07-10 10:00:00'),
    (10, 'speech_to_text', 'v2.0.0', 'PyTorch', 'speech_recognition', 1550.0, 'active', '2024-08-20 11:00:00'),
    (11, 'code_assistant', 'v4.2.0', 'PyTorch', 'code_generation', 13000.0, 'active', '2024-10-01 08:00:00'),
    (12, 'translation_engine', 'v1.5.2', 'TensorFlow', 'translation', 600.0, 'active', '2025-01-15 09:00:00'),
    (13, 'content_moderator', 'v2.1.0', 'PyTorch', 'moderation', 350.0, 'deprecated', '2023-07-01 10:00:00'),
    (14, 'price_optimizer', 'v1.0.1', 'XGBoost', 'optimization', 5.5, 'deprecated', '2023-10-01 08:00:00'),
    (15, 'document_parser', 'v3.0.0', 'custom', 'document_extraction', 1200.0, 'archived', '2023-06-20 09:00:00'),
]

out.append("\n-- Models (15)")
vals = []
for m in models_data:
    vals.append(f"('{uid('aa000000', m[0])}', '{m[1]}', '{m[2]}', '{m[3]}', '{m[4]}', {m[5]}, '{m[6]}', '{m[7]}')")
out.append(f"INSERT INTO models (id, name, version, framework, task_type, parameters_millions, status, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Experiments (100)
exp_status_dist = ['completed']*50 + ['running']*20 + ['failed']*15 + ['queued']*10 + ['cancelled']*5
datasets = ['ImageNet-1k', 'GLUE', 'SQuAD-2.0', 'CommonCrawl-2024', 'COCO-2024', 'WMT-2024-ENES',
            'WikiText-103', 'OpenWebText', 'MNLI', 'SST-2', 'CoNLL-2003', 'AG-News',
            'CIFAR-100', 'Fashion-MNIST', 'IMDB-Reviews', 'Amazon-Reviews-2024',
            'HumanEval-Plus', 'MBPP', 'MultiPL-E', 'IEEE-CIS-Fraud',
            'MedQA-2024', 'ChestX-ray14', 'TweetEval-2024', 'CommonVoice-15',
            'CUAD-v2', 'SROIE-2024', 'RustBench-2024', 'CaseLaw-50k', 'Kaggle-Retail-2024', 'NYC-Taxi-2024']
exp_names = [
    '{model} fine-tune on {dataset}', '{model} benchmark on {dataset}', '{model} evaluation {dataset}',
    '{model} training run {dataset}', '{model} hyperparameter sweep {dataset}', '{model} ablation study {dataset}',
    '{model} domain adaptation {dataset}', '{model} transfer learning {dataset}',
]

out.append("\n-- Experiments (100)")
exp_rows = []
for i in range(1, 101):
    model_idx = random.randint(1, 15)
    model_name = models_data[model_idx-1][1]
    stat = exp_status_dist[i-1]
    dataset = random.choice(datasets)
    name = random.choice(exp_names).format(model=model_name, dataset=dataset)

    epochs = random.randint(1, 100)
    lr = round(random.uniform(0.00001, 0.1), 8)

    started = random_date()
    if stat == 'completed':
        acc = round(random.uniform(0.60, 0.98), 4)
        loss = round(random.uniform(0.01, 0.8), 6)
        completed = started + timedelta(hours=random.randint(2, 120))
        completed_str = f"'{fmt_ts(completed)}'"
        acc_str = str(acc)
        loss_str = str(loss)
    elif stat == 'failed':
        acc = round(random.uniform(0.10, 0.50), 4)
        loss = round(random.uniform(0.8, 1.5), 6)
        completed = started + timedelta(hours=random.randint(1, 24))
        completed_str = f"'{fmt_ts(completed)}'"
        acc_str = str(acc)
        loss_str = str(loss)
    elif stat == 'running':
        completed_str = "NULL"
        acc_str = "NULL"
        loss_str = "NULL"
    else:  # queued, cancelled
        completed_str = "NULL"
        acc_str = "NULL"
        loss_str = "NULL"

    exp_rows.append((uid('bb000000', i), uid('aa000000', model_idx), name, dataset, stat, acc_str, loss_str, epochs, lr, fmt_ts(started), completed_str))

for batch_start in range(0, len(exp_rows), 50):
    batch = exp_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{esc(r[2])}', '{r[3]}', '{r[4]}', {r[5]}, {r[6]}, {r[7]}, {r[8]}, '{r[9]}', {r[10]})")
    out.append(f"INSERT INTO experiments (id, model_id, name, dataset, status, accuracy, loss, epochs, learning_rate, started_at, completed_at) VALUES\n" + ",\n".join(vals) + ";")

# Deployments (40)
dep_env_dist = ['production']*16 + ['staging']*14 + ['development']*10
dep_stat_dist = ['active']*24 + ['rolled_back']*6 + ['canary']*6 + ['deprecated']*4

out.append("\n-- Deployments (40)")
dep_rows = []
active_dep_ids = []
for i in range(1, 41):
    model_idx = ((i-1) % 15) + 1
    model_name = models_data[model_idx-1][1]
    env = dep_env_dist[i-1]
    stat = dep_stat_dist[i-1]

    if env == 'production':
        action = random.choice(['predict', 'infer', 'analyze', 'detect', 'generate'])
        url = f"https://api.platform.ai/v{random.randint(1,4)}/{model_name}/{action}"
    elif env == 'staging':
        action = random.choice(['predict', 'infer', 'analyze'])
        url = f"https://staging.platform.ai/v{random.randint(1,4)}/{model_name}/{action}"
    else:
        url = f"https://dev.platform.ai/v{random.randint(1,4)}/{model_name}/predict"

    if stat in ('deprecated', 'rolled_back'):
        rpd = 0
    elif env == 'production':
        rpd = random.randint(10000, 1500000)
    elif env == 'staging':
        rpd = random.randint(100, 10000)
    else:
        rpd = random.randint(10, 500)

    params = models_data[model_idx-1][5]
    if params > 1000:
        lat = round(random.uniform(200, 5000), 2)
    elif params > 100:
        lat = round(random.uniform(50, 500), 2)
    elif params > 10:
        lat = round(random.uniform(20, 200), 2)
    else:
        lat = round(random.uniform(5, 50), 2)

    deployed = random_date()
    dep_rows.append((uid('cc000000', i), uid('aa000000', model_idx), env, url, stat, rpd, lat, fmt_ts(deployed)))

    if stat in ('active', 'canary'):
        active_dep_ids.append(i)

vals = []
for r in dep_rows:
    vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', '{r[3]}', '{r[4]}', {r[5]}, {r[6]}, '{r[7]}')")
out.append(f"INSERT INTO deployments (id, model_id, environment, endpoint_url, status, requests_per_day, avg_latency_ms, deployed_at) VALUES\n" + ",\n".join(vals) + ";")

# Events (500)
event_type_dist = ['prediction']*200 + ['training']*75 + ['drift_detected']*50 + ['alert']*50 + ['deployment']*50 + ['error']*40 + ['retraining']*35
error_messages = {
    400: ["Invalid input format: expected JSON", "Token limit exceeded: max 4096 tokens", "Missing required field: input_text", "Invalid model parameters"],
    429: ["Rate limit exceeded. Retry after 30 seconds.", "Too many requests. Please slow down.", "Quota exceeded for current billing period"],
    500: ["CUDA out of memory: tried to allocate 2.5 GiB", "Internal server error: model inference failed", "Unexpected error during prediction"],
    503: ["Service temporarily unavailable: model replica restarting", "Backend service unavailable", "Model warming up, please retry"],
    504: ["Gateway timeout: upstream service did not respond within 5000ms", "Request timed out after 30 seconds"],
}

out.append("\n-- Events (500)")
event_rows = []
for i in range(1, 501):
    dep_idx = random.choice(active_dep_ids) if random.random() < 0.8 else random.randint(1, 40)
    etype = event_type_dist[i-1]

    dep_model_idx = ((dep_idx-1) % 15)
    params = models_data[dep_model_idx][5]

    if params > 1000:
        in_tok = random.randint(100, 160000)
        out_tok = random.randint(50, 4096)
        lat = round(random.uniform(100, 5000), 2)
    elif params > 100:
        in_tok = random.randint(50, 5000)
        out_tok = random.randint(1, 1000)
        lat = round(random.uniform(30, 500), 2)
    elif params > 10:
        in_tok = random.randint(10, 2000)
        out_tok = random.randint(1, 500)
        lat = round(random.uniform(10, 200), 2)
    else:
        in_tok = random.randint(1, 500)
        out_tok = random.randint(1, 50)
        lat = round(random.uniform(5, 80), 2)

    if random.random() < 0.85:
        status_code = 200
        err_msg = "NULL"
    else:
        status_code = random.choice([400, 429, 500, 503, 504])
        err_msg = f"'{esc(random.choice(error_messages[status_code]))}'"

    created = random_date()
    event_rows.append((uid('dd000000', i), uid('cc000000', dep_idx), etype, in_tok, out_tok, lat, status_code, err_msg, fmt_ts(created)))

for batch_start in range(0, len(event_rows), 50):
    batch = event_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', {r[3]}, {r[4]}, {r[5]}, {r[6]}, {r[7]}, '{r[8]}')")
    out.append(f"INSERT INTO events (id, deployment_id, event_type, input_tokens, output_tokens, latency_ms, status_code, error_message, created_at) VALUES\n" + ",\n".join(vals) + ";")

with open('/home/user/databox/apps/sandbox/public/data/ai-events.sql', 'w') as f:
    f.write('\n\n'.join(out) + '\n')
print("Generated ai-events.sql")
