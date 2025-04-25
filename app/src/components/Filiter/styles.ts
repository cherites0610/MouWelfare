import { StyleSheet } from 'react-native';
import { COLORS } from "../../utils/colors"

export default StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    height: 50,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  filterIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginLeft: 10,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  arrow: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});