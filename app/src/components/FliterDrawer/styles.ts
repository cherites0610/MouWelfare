import { StyleSheet } from 'react-native';
import { COLORS } from '@/src/utils/colors';

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#444',
  },
  optionsContainer: {
    flexDirection: 'column',
  },
  optionsRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonRow: {
    marginRight: 10,
  },
  selectedOptionButton: {
    backgroundColor: COLORS.background,
    opacity: 0.7,
    borderColor: 'rgba(62,142,67,1)',
  },
  optionText: {
    fontSize: 14,
    color: '#555',
  },
  selectedOptionText: {
    color: 'black',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    backgroundColor: '#fafafa',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#eee',
    // justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  confirmButton: {
    backgroundColor: COLORS.background,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  clearButtonText: {
    color: '#777',
    fontSize: 16,
    fontWeight: 'bold',
  },
});