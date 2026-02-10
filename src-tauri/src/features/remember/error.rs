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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;

    #[test]
    fn test_io_error_display() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "File not found");
        let remember_err = RememberError::Io(io_err);
        let display_str = format!("{}", remember_err);
        assert!(display_str.contains("I/O error"));
        assert!(display_str.contains("File not found"));
    }

    #[test]
    fn test_invalid_card_error_display() {
        let error = RememberError::InvalidCard("Missing frontmatter".to_string());
        let display_str = format!("{}", error);
        assert_eq!(display_str, "Invalid card: Missing frontmatter");
    }

    #[test]
    fn test_invalid_source_error_display() {
        let error = RememberError::InvalidSource("Bad format".to_string());
        let display_str = format!("{}", error);
        assert_eq!(display_str, "Invalid source: Bad format");
    }

    #[test]
    fn test_card_not_found_error_display() {
        let error = RememberError::CardNotFound("/path/to/card.md".to_string());
        let display_str = format!("{}", error);
        assert_eq!(display_str, "Card not found: /path/to/card.md");
    }

    #[test]
    fn test_serialization_error_display() {
        let error = RememberError::Serialization("Failed to serialize JSON".to_string());
        let display_str = format!("{}", error);
        assert_eq!(display_str, "Serialization error: Failed to serialize JSON");
    }

    #[test]
    fn test_error_debug() {
        let error = RememberError::InvalidCard("Test message".to_string());
        let debug_str = format!("{:?}", error);
        assert!(debug_str.contains("InvalidCard"));
        assert!(debug_str.contains("Test message"));
    }

    #[test]
    fn test_error_trait_implementation() {
        let error = RememberError::CardNotFound("test.md".to_string());
        // Test that it implements std::error::Error
        let _error_trait: &dyn std::error::Error = &error;
        
        // Test source() method (should return None for our simple errors)
        assert!(std::error::Error::source(&error).is_none());
    }

    #[test]
    fn test_all_error_variants_exist() {
        // Test that all expected error variants can be created
        let _io_err = RememberError::Io(io::Error::new(io::ErrorKind::Other, "test"));
        let _invalid_card = RememberError::InvalidCard("test".to_string());
        let _invalid_source = RememberError::InvalidSource("test".to_string());
        let _card_not_found = RememberError::CardNotFound("test".to_string());
        let _serialization = RememberError::Serialization("test".to_string());
        
        // If we can create all variants without compilation errors, test passes
        assert!(true);
    }

    #[test]
    fn test_error_from_io_error() {
        let io_err = io::Error::new(io::ErrorKind::PermissionDenied, "Access denied");
        let remember_err = RememberError::Io(io_err);
        
        if let RememberError::Io(inner) = remember_err {
            assert_eq!(inner.kind(), io::ErrorKind::PermissionDenied);
        } else {
            panic!("Expected RememberError::Io variant");
        }
    }

    #[test]
    fn test_error_pattern_matching() {
        let errors = vec![
            RememberError::InvalidCard("test".to_string()),
            RememberError::CardNotFound("test.md".to_string()),
            RememberError::Serialization("json error".to_string()),
        ];

        let mut card_errors = 0;
        let mut not_found_errors = 0;
        let mut serialization_errors = 0;

        for error in errors {
            match error {
                RememberError::InvalidCard(_) => card_errors += 1,
                RememberError::CardNotFound(_) => not_found_errors += 1,
                RememberError::Serialization(_) => serialization_errors += 1,
                _ => {}
            }
        }

        assert_eq!(card_errors, 1);
        assert_eq!(not_found_errors, 1);
        assert_eq!(serialization_errors, 1);
    }
}
