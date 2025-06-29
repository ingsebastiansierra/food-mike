import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { getRestaurantById, getRestaurantProducts } from '../data/restaurantsData';
import ProductCard from '../components/ProductCard';
import CartHeaderButton from '../components/CartHeaderButton';
import { useCart } from '../context/CartContext';
import { showAlert } from '../utils';
import { restaurantsService } from '../services/restaurantsService';
import { productsService } from '../services/productsService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const RestaurantDetailScreen = ({ route, navigation }) => {
  const { restaurantId, productId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addToCart, getTotalQuantity } = useCart();

  // Cargar datos del restaurante y productos
  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  const loadRestaurantData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar restaurante y productos en paralelo
      const [restaurantResponse, productsResponse] = await Promise.all([
        restaurantsService.getById(restaurantId),
        productsService.getByRestaurant(restaurantId)
      ]);

      setRestaurant(restaurantResponse.data);
      setProducts(productsResponse.data || []);

      // Si hay un producto específico, navegar a él
      if (productId) {
        // Aquí podrías implementar scroll automático al producto
        console.log('Producto específico:', productId);
      }
    } catch (error) {
      console.error('Error cargando datos del restaurante:', error);
      showAlert('Error', 'No se pudieron cargar los datos del restaurante.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, productId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRestaurantData();
    setRefreshing(false);
  }, [loadRestaurantData]);

  // Obtener categorías únicas de los productos
  const getCategories = () => {
    const categories = ['all', ...new Set(products.map(p => p.category))];
    return categories.map(cat => ({
      id: cat,
      name: cat === 'all' ? 'Todos' : cat,
    }));
  };

  // Filtrar productos por categoría
  const getFilteredProducts = () => {
    if (selectedCategory === 'all') {
      return products;
    }
    return products.filter(product => product.category === selectedCategory);
  };

  // Renderizar estrellas
  const renderStars = (stars) => {
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 !== 0;
    
    return (
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, index) => (
          <Ionicons
            key={index}
            name={index < fullStars ? "star" : index === fullStars && hasHalfStar ? "star-half" : "star-outline"}
            size={16}
            color={colors.primary}
          />
        ))}
        <Text style={styles.starsText}>{stars}</Text>
      </View>
    );
  };

  // Función para agregar al carrito
  const handleAddToCart = useCallback((product) => {
    if (!restaurant) {
      showAlert('Error', 'Información del restaurante no disponible');
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
    showAlert('Éxito', `${product.name} agregado al carrito`);
  }, [addToCart, restaurant]);

  // Función para navegar al carrito
  const handleCartPress = () => {
    if (getTotalQuantity() > 0) {
      navigation.navigate('Carrito');
    } else {
      showAlert('Carrito', 'Tu carrito está vacío. Agrega algunos productos primero.');
    }
  };

  // Renderizar item de producto
  const renderProductItem = ({ item }) => {
    if (!restaurant) {
      return null;
    }
    
    return (
      <ProductCard
        product={{
          ...item,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            stars: restaurant.stars,
            address: restaurant.address,
            image: restaurant.image,
            deliveryTime: restaurant.deliveryTime,
            deliveryFee: restaurant.deliveryFee,
          }
        }}
        onPress={() => {
          // Aquí se podría navegar a un detalle del producto
          showAlert('Producto', `${item.name} - $${item.price.toFixed(2)}`);
        }}
        onAddToCart={() => handleAddToCart(item)}
      />
    );
  };

  // Renderizar categoría
  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.categoryTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando restaurante...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color={colors.error} />
        <Text style={styles.errorText}>Restaurante no encontrado</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadRestaurantData}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredProducts = getFilteredProducts();
  const categories = getCategories();

  // Normalizar la imagen del restaurante
  const normalizedRestaurantImage = typeof restaurant.image === 'string' ? { uri: restaurant.image } : restaurant.image;

  return (
    <View style={styles.container}>
      {/* Header con imagen del restaurante */}
      <View style={styles.header}>
        <Image source={normalizedRestaurantImage} style={styles.headerImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <CartHeaderButton
                onPress={handleCartPress}
                style={styles.cartButton}
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Información del restaurante */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          
          <View style={styles.ratingRow}>
            {renderStars(restaurant.stars)}
            <Text style={styles.category}>{restaurant.category}</Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color={colors.gray} />
              <Text style={styles.detailText}>{restaurant.address}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.gray} />
              <Text style={styles.detailText}>{restaurant.schedule}</Text>
            </View>
          </View>

          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryItem}>
              <Ionicons name="bicycle-outline" size={16} color={colors.primary} />
              <Text style={styles.deliveryText}>{restaurant.deliveryTime}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="card-outline" size={16} color={colors.primary} />
              <Text style={styles.deliveryText}>{restaurant.deliveryFee}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="bag-outline" size={16} color={colors.primary} />
              <Text style={styles.deliveryText}>Mín. {restaurant.minOrder}</Text>
            </View>
          </View>
        </View>

        {/* Categorías */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Productos */}
        <View style={styles.productsSection}>
          <View style={styles.productsHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'Todos los productos' : selectedCategory}
            </Text>
            <Text style={styles.productsCount}>
              {filteredProducts.length} productos
            </Text>
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    color: colors.gray,
  },
  header: {
    height: height * 0.3,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
  },
  restaurantInfo: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  restaurantName: {
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starsText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.darkGray,
    marginLeft: 4,
  },
  category: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.lightPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  detailsRow: {
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: 6,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    flex: 1,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.darkGray,
  },
  categoriesSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  categoriesList: {
    paddingRight: spacing.lg,
  },
  categoryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.sm,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryTextActive: {
    color: colors.white,
  },
  productsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  productsCount: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
  },
});

export default RestaurantDetailScreen; 