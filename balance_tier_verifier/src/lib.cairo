use starknet::ContractAddress;
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
pub trait IBalanceTierVerifier<T> {
    fn verify_and_claim(ref self: T, proof: Array<felt252>, owner_id: felt252, category: u8) -> bool;
    fn get_verified_category(self: @T, owner_id: felt252) -> u8;
}

#[starknet::contract]
mod BalanceTierVerifier {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        verified_categories: Map<felt252, u8>,
        claimed: Map<(felt252, u8), bool>,
    }

    #[event]
    fn CategoryVerified(owner_id: felt252, category: u8) {}

    #[external(v0)]
    impl BalanceTierVerifierImpl of super::IBalanceTierVerifier<ContractState> {
        fn verify_and_claim(ref self: ContractState, proof: Array<felt252>, owner_id: felt252, category: u8) -> bool {
            self.verified_categories.write(owner_id, category);
            self.claimed.write((owner_id, category), true);
            CategoryVerified(owner_id, category);
            true
        }

        fn get_verified_category(self: @ContractState, owner_id: felt252) -> u8 {
            self.verified_categories.read(owner_id)
        }
    }
}
