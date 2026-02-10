// Oxidian — Remember Error types

use std::fmt;

#[derive(Debug)]
pub enum RememberError {
    Io(std::io::Error),
    InvalidCard(String),
    InvalidSource(String),
    CardNotFound(String),
    Serialization(String),
}

impl fmt::Display for RememberError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(e) => write!(f, "I/O error: {}", e),
            Self::InvalidCard(msg) => write!(f, "Invalid card: {}", msg),
            Self::InvalidSource(msg) => write!(f, "Invalid source: {}", msg),
            Self::CardNotFound(path) => write!(f, "Card not found: {}", path),
            Self::Serialization(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl std::error::Error for RememberError {}
