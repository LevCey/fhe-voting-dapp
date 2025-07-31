# 🔐 FHEVM Voting dApp

A complete privacy-preserving voting dApp built with Zama.ai's FHEVM (Fully Homomorphic Encryption Virtual Machine). This dApp demonstrates how to create a secure, encrypted voting system where votes remain private while still allowing for verifiable results.

## 🌟 Features

- **🔒 Privacy-Preserving Voting**: All votes are encrypted using FHEVM
- **🗳️ Secure Ballot Casting**: One vote per address per proposal
- **📊 Transparent Results**: Decrypted results after voting period ends
- **⏰ Time-Bound Proposals**: Configurable voting periods
- **👑 Owner Controls**: Proposal creation and result decryption
- **🔍 Vote Verification**: Check if you've voted on specific proposals
- **📱 TypeScript Frontend**: Interactive command-line interface

## 🏗️ Architecture

### Smart Contract (`EncryptedVoting.sol`)
- **FHEVM Integration**: Uses `@fhenix/contracts` for encrypted operations
- **Proposal Management**: Create, view, and manage voting proposals
- **Encrypted Vote Processing**: Handles encrypted vote casting and counting
- **Result Decryption**: Secure decryption of final vote counts
- **Access Control**: Owner-only functions for administrative tasks

### Frontend Application
- **TypeScript CLI**: Interactive command-line interface
- **FHEVM Integration**: Client-side vote encryption
- **Ether.js Integration**: Blockchain interaction
- **Real-time Updates**: Live proposal and result viewing

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Sepolia testnet ETH
- Infura or Alchemy account for RPC endpoint

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fhe-voting-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

4. **Compile the smart contract**
   ```bash
   npm run compile
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Deploy to Sepolia**
   ```bash
   npm run deploy
   ```

7. **Start the dApp**
   ```bash
   npm start
   ```

## 📖 Usage Guide

### For Contract Owners

1. **Create a Proposal**
   - Select option 2 from the main menu
   - Enter proposal title and description
   - Set start time (minutes from now)
   - Set duration (hours)

2. **End a Proposal**
   - Select option 5 from the main menu
   - Enter the proposal ID
   - Results will be decrypted and displayed

### For Voters

1. **View Proposals**
   - Select option 1 to see all active proposals
   - Select option 4 to view specific proposal details

2. **Cast Your Vote**
   - Select option 3 from the main menu
   - Enter the proposal ID
   - Choose 1 for Yes or 0 for No
   - Your vote will be encrypted and submitted

3. **Check Your Vote Status**
   - Select option 7 to verify if you've voted on a proposal

4. **View Results**
   - Select option 6 to see decrypted vote results (if available)

## 🔧 Technical Details

### FHEVM Integration

The dApp uses Zama.ai's FHEVM for encrypted voting:

```typescript
// Encrypt a vote
const instance = getInstance();
const encryptedVote = instance.encrypt32(vote);
const voteProof = instance.generateProof(encryptedVote);
```

### Smart Contract Functions

#### Core Functions
- `createProposal()`: Create new voting proposals (owner only)
- `castVote()`: Cast encrypted votes
- `endProposal()`: End voting and decrypt results (owner only)
- `getProposal()`: Get proposal details
- `getVoteResults()`: Get decrypted vote results
- `hasVoted()`: Check if address has voted

#### FHEVM Operations
- `FHE.fromExternal()`: Convert external encrypted data
- `FHE.add()`: Add encrypted values
- `FHE.eq()`: Compare encrypted values
- `FHE.select()`: Conditional selection
- `FHE.decrypt()`: Decrypt final results

### Security Features

- **Vote Privacy**: All votes are encrypted using FHEVM
- **One Vote Per Address**: Prevents double voting
- **Time-Bound Voting**: Configurable voting periods
- **Owner Controls**: Administrative functions restricted to owner
- **Verifiable Results**: Transparent decryption of final counts

## 🧪 Testing

The project includes comprehensive tests covering:

- Contract deployment
- Proposal creation and management
- Encrypted vote casting
- Result decryption
- Access control
- Error handling

Run tests with:
```bash
npm test
```

## 📁 Project Structure

```
fhe-voting-dapp/
├── contracts/
│   └── EncryptedVoting.sol          # Main smart contract
├── scripts/
│   └── deploy.ts                    # Deployment script
├── test/
│   └── EncryptedVoting.test.ts      # Contract tests
├── src/
│   ├── frontend/
│   │   └── index.ts                 # Main dApp interface
│   └── utils/
│       └── contract-utils.ts        # Utility functions
├── hardhat.config.ts                # Hardhat configuration
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🔗 Dependencies

### Smart Contract
- `@fhenix/contracts`: FHEVM Solidity library
- `hardhat`: Development framework
- `ethers`: Ethereum library

### Frontend
- `@fhenix/fhevm`: FHEVM JavaScript library
- `ethers`: Ethereum interaction
- `chalk`: Terminal styling
- `inquirer`: User input handling

## 🌐 Network Support

Currently configured for:
- **Sepolia Testnet**: Primary deployment target
- **Hardhat Network**: Local development and testing

## 🔍 Monitoring

### Contract Events
- `ProposalCreated`: New proposal created
- `VoteCast`: Vote submitted
- `VoteDecrypted`: Results decrypted
- `ProposalEnded`: Voting period ended

### Transaction Tracking
All transactions include:
- Transaction hash
- Gas usage
- Block confirmation
- Error handling

## 🛠️ Development

### Adding New Features

1. **Smart Contract Extensions**
   - Add new functions to `EncryptedVoting.sol`
   - Update tests in `EncryptedVoting.test.ts`
   - Deploy updated contract

2. **Frontend Enhancements**
   - Extend `FHEVotingDApp` class in `index.ts`
   - Add new menu options
   - Update utility functions in `contract-utils.ts`

### Debugging

- Use Hardhat console for contract debugging
- Check transaction logs for detailed error information
- Monitor FHEVM encryption/decryption operations

## 📚 Resources

- [Zama.ai FHEVM Documentation](https://docs.zama.ai/)
- [FHEVM GitHub Repository](https://github.com/zama-ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is a demonstration project for educational purposes. For production use, additional security audits and considerations are required.

## 🆘 Support

For issues and questions:
- Check the documentation
- Review test cases
- Open an issue on GitHub

---

**Built with ❤️ using Zama.ai's FHEVM technology** 