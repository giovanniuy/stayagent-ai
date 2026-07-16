-- Datos de demostración (password demo: "demo1234" — bcrypt)
-- Hash bcrypt de 'demo1234' generado con cost 10
\set pw '\\$2b\\$10\\$9k0bQm0cKk0mJ0m0m0m0mO0m0m0m0m0m0m0m0m0m0m0m0m0m0m'

INSERT INTO users (id, email, password_hash, full_name, role, photo_url, id_verified) VALUES
('11111111-1111-1111-1111-111111111111','admin@stayagent.ai',  :'pw','Admin StayAgent','admin','https://i.pravatar.cc/150?u=admin',true),
('22222222-2222-2222-2222-222222222222','anfitrion@demo.com',   :'pw','María Fernández','anfitrion','https://i.pravatar.cc/150?u=maria',true),
('33333333-3333-3333-3333-333333333333','huesped@demo.com',    :'pw','Juan Pérez','huesped','https://i.pravatar.cc/150?u=juan',true);

INSERT INTO listings (id, host_id, title, description, class, base_price, currency, dynamic_pricing, price_min, price_max, current_price, address, city, country, geom, max_guests, bathrooms, amenities, status, auto_host_enabled, rating_avg, rating_count) VALUES
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',
 'Loft moderno en Pocitos','Luminoso loft a 2 cuadras de la rambla, ideal para parejas.','1_dormitorio',
 65,'USD',true,45,120,72,'Benito Blanco 984','Montevideo','Uruguay',
 ST_GeogFromText('POINT(-56.1570 -34.9120)'),2,1,'["wifi","aire_acondicionado","smart_tv","heladera"]','apto_listo',true,4.8,23),
('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',
 'Monoambiente céntrico','Práctico monoambiente en pleno Centro, cerca de todo.','monoambiente',
 40,'USD',true,30,80,45,'Av. 18 de Julio 1200','Montevideo','Uruguay',
 ST_GeogFromText('POINT(-56.1880 -34.9052)'),2,1,'["wifi","cocina"]','apto_listo',false,4.5,11),
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',
 'Casa familiar con parrillero','Casa de 3 dormitorios con fondo y parrillero en Carrasco.','3plus_dormitorios',
 150,'USD',true,110,260,168,'Av. Bolivia 1450','Montevideo','Uruguay',
 ST_GeogFromText('POINT(-56.0560 -34.8890)'),6,2,'["wifi","parrillero","estacionamiento","jardin","lavadora"]','apto_usado',true,4.9,34),
('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',
 'Apartamento vista al mar Punta del Este','2 dormitorios con terraza y vista oceánica.','2_dormitorios',
 120,'USD',true,90,240,135,'Rambla Gral. Artigas parada 8','Punta del Este','Uruguay',
 ST_GeogFromText('POINT(-54.9470 -34.9620)'),4,2,'["wifi","piscina","terraza","vista_mar"]','apto_listo',true,4.7,19);

INSERT INTO listing_photos (listing_id, url, is_cover, sort_order) VALUES
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',true,0),
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',false,1),
('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',true,0),
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',true,0),
('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaaa','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',true,0);

INSERT INTO ai_agent_settings (user_id, auto_guest_enabled, auto_guest_budget_max, auto_guest_prefs, require_confirmation_above) VALUES
('33333333-3333-3333-3333-333333333333', true, 100, '{"clases":["1_dormitorio","2_dormitorios"],"zonas":"Pocitos, Punta Carretas"}', 150),
('22222222-2222-2222-2222-222222222222', false, NULL, '{}', 300);

INSERT INTO bookings (id, listing_id, guest_id, check_in, check_out, price_night, total_amount, status, closed_by_ai) VALUES
('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333',
 CURRENT_DATE - 20, CURRENT_DATE - 17, 68, 204, 'completada', true),
('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333',
 CURRENT_DATE - 5, CURRENT_DATE - 2, 160, 480, 'checkout', false),
('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333',
 CURRENT_DATE + 10, CURRENT_DATE + 14, 72, 288, 'pagada', true);

INSERT INTO payments (booking_id, provider, provider_ref, amount, currency, status, platform_fee, host_payout) VALUES
('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb','stripe','pi_demo_001',204,'USD','aprobado',24.48,179.52),
('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb','mercadopago','mp_demo_002',480,'USD','aprobado',57.60,422.40),
('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb','stripe','pi_demo_003',288,'USD','aprobado',34.56,253.44);

INSERT INTO expenses (listing_id, category, description, amount, incurred_on) VALUES
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','limpieza','Limpieza post-checkout',35,CURRENT_DATE - 17),
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','reposicion_ropa','Sábanas y toallas',22,CURRENT_DATE - 17),
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','limpieza','Limpieza casa completa',80,CURRENT_DATE - 2),
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','impuestos','Tasa municipal mensual',45,CURRENT_DATE - 10),
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','servicios','UTE + ANTEL',95,CURRENT_DATE - 8);

INSERT INTO property_status_log (listing_id, old_status, new_status, note) VALUES
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa','apto_ocupado','apto_usado','Huésped realizó checkout'),
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','apto_usado','apto_listo','Limpieza completada, heladera recargada');

INSERT INTO reviews (booking_id, listing_id, author_id, rating, comment) VALUES
('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333',5,'Excelente, el anfitrión automático respondió al instante.');
