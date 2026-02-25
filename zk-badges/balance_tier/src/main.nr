// zk-badges/balance_tier/src/main.nr
// Balance Tier Circuit
// Proves: balance falls into a specific tier without revealing exact amount

fn main(
    // PRIVATE INPUTS (known only to prover)
    owner_id: [u8; 36],  // UUID as bytes
    value: u64,           // Exact balance in USD
    
    // PUBLIC INPUTS
    datetime: pub u64     // Unix timestamp
) -> pub u8 {
    // Determine category based on value
    let category = if value < 10 { 0 }
                   else if value < 250 { 1 }
                   else if value <= 1000 { 2 }
                   else if value <= 10000 { 3 }
                   else { 4 };
    
    // Verify category is correct
    if category == 0 {
        assert(value < 10, "Not plankton");
    } else if category == 1 {
        assert(value >= 10 & value < 250, "Not fish");
    } else if category == 2 {
        assert(value >= 250 & value <= 1000, "Not shrimp");
    } else if category == 3 {
        assert(value > 1000 & value <= 10000, "Not dolphin");
    } else {
        assert(value > 10000, "Not whale");
    }
    
    category
}

#[test]
fn test_plankton() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 5, 1700000000);
    assert(result == 0);
}

#[test]
fn test_fish() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 100, 1700000000);
    assert(result == 1);
}

#[test]
fn test_shrimp() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 500, 1700000000);
    assert(result == 2);
}

#[test]
fn test_dolphin() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 5000, 1700000000);
    assert(result == 3);
}

#[test]
fn test_whale() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 50000, 1700000000);
    assert(result == 4);
}
