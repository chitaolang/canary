use std::time::Duration;
use tokio::time::sleep;

use canary_sdk::client::{create_sui_client, Network};
use sui_sdk::types::base_types::ObjectID;

#[tokio::main]
async fn main() {
    println!("Canary Worker - Starting...");

    // Load environment variables
    dotenv::dotenv().ok();

    // Get task interval from environment (default: 3600 seconds = 1 hour)
    let interval_seconds: u64 = std::env::var("TASK_INTERVAL_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3600);

    println!("Task interval: {} seconds", interval_seconds);
    println!("Worker started, waiting for first execution...");

    loop {
        println!("\n=== Starting task execution ===");

        match run_task().await {
            Ok(_) => {
                println!("Task completed successfully");
            }
            Err(e) => {
                eprintln!("Task failed with error: {}", e);
            }
        }

        println!(
            "Waiting {} seconds until next execution...",
            interval_seconds
        );
        sleep(Duration::from_secs(interval_seconds)).await;
    }
}

async fn run_task() -> Result<(), Box<dyn std::error::Error>> {
    // Get network from environment (default: Devnet)
    let network_str = std::env::var("SUI_NETWORK")
        .unwrap_or_else(|_| "devnet".to_string())
        .to_lowercase();

    let network = match network_str.as_str() {
        "localnet" => Network::Localnet,
        "devnet" => Network::Devnet,
        "testnet" => Network::Testnet,
        "mainnet" => Network::Mainnet,
        url => Network::Custom(url.to_string()),
    };

    println!("Connecting to network: {:?}", network);

    // Create Sui client
    let client = create_sui_client(network).await?;
    println!("Connected to Sui network");

    // Get registry ID from environment variable
    let registry_id_str =
        std::env::var("REGISTRY_ID").map_err(|_| "REGISTRY_ID environment variable is required")?;

    let registry_id = ObjectID::from_hex_literal(&registry_id_str)
        .map_err(|e| format!("Invalid REGISTRY_ID format: {}", e))?;

    println!("Querying members for registry: {}", registry_id);

    println!("Found {} members:", members.len());
    for (idx, member) in members.iter().enumerate() {
        println!(
            "  {}. Address: {}, Domain: {}, Joined: {}",
            idx + 1,
            member.member,
            member.domain,
            member.joined_at
        );
    }

    Ok(())
}
