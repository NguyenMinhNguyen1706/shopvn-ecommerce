# ═══════════════════════════════════════════════════════════════════════════════
# Terraform Config — GCP Provisioning for ShopVN E-Commerce (1M user scale)
# Concepts: Infrastructure as Code, Terraform, DNS, Secrets Management
# ═══════════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── NETWORK (VPC) ─────────────────────────────────────────────────────────────
resource "google_compute_network" "vpc_network" {
  name                    = "shopvn-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "shopvn-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# ── KUBERNETES CLUSTER (GKE) ──────────────────────────────────────────────────
# Concept: Kubernetes, Autoscaling
resource "google_container_cluster" "gke_cluster" {
  name     = "shopvn-gke-cluster"
  location = var.region
  
  network    = google_compute_network.vpc_network.name
  subnetwork = google_compute_subnetwork.subnet.name

  initial_node_count = 3
  
  # Enable Autoscaling on the cluster level
  node_config {
    machine_type = "e2-standard-4" # 4 vCPUs, 16 GB RAM
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  ip_allocation_policy {}
}

# ── DATABASE (Cloud SQL PostgreSQL) ───────────────────────────────────────────
# Concept: Read Replicas, High Availability
resource "google_sql_database_instance" "postgres_primary" {
  name             = "shopvn-postgres-primary"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-8-32768" # 8 vCPUs, 32GB RAM for 1M scale
    availability_type = "REGIONAL" # High Availability (Multi-Zone)

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }
  }
}

# Read Replica for horizontal database read scaling - Concept: Read Replicas
resource "google_sql_database_instance" "postgres_replica" {
  name                 = "shopvn-postgres-replica"
  database_version     = "POSTGRES_15"
  region               = var.region
  master_instance_name = google_sql_database_instance.postgres_primary.name

  settings {
    tier = "db-custom-8-32768"
  }
}

# ── REDIS (Cloud Memorystore) ────────────────────────────────────────────────
resource "google_redis_instance" "redis_cache" {
  name           = "shopvn-redis"
  tier           = "STANDARD_HA" # High availability with automatic failover
  memory_size_gb = 10
  region         = var.region

  authorized_network = google_compute_network.vpc_network.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
}

# ── DNS RECORDS ───────────────────────────────────────────────────────────────
# Concept: DNS
resource "google_dns_managed_zone" "dns_zone" {
  name     = "shopvn-zone"
  dns_name = "shopvn-ecommerce.com."
}

resource "google_dns_record_set" "api" {
  name         = "api.${google_dns_managed_zone.dns_zone.dns_name}"
  managed_zone = google_dns_managed_zone.dns_zone.name
  type         = "A"
  ttl          = 300
  rrdatas      = [var.load_balancer_ip]
}
