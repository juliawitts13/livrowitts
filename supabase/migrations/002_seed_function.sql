-- ================================================================
-- Story OS — Função de Seed para Usuário Demo
-- Chamada automaticamente no primeiro login
-- ================================================================

CREATE OR REPLACE FUNCTION seed_demo_project(p_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_project_id  UUID;
  v_act1_id     UUID;
  v_act2_id     UUID;
  v_act3_id     UUID;
  v_elara_id    UUID;
  v_kael_id     UUID;
  v_syra_id     UUID;
  v_mira_id     UUID;
  v_ronan_id    UUID;
  v_ashenveil   UUID;
  v_forest_id   UUID;
  v_academy_id  UUID;
  v_porto_id    UUID;
  v_cofre_id    UUID;
  v_ch24_id     UUID;
  v_ch23_id     UUID;
  v_ch22_id     UUID;
  v_ch21_id     UUID;
  v_ch20_id     UUID;
  v_ch19_id     UUID;
  v_ch18_id     UUID;
  v_ch17_id     UUID;
  v_ev1_id      UUID;
  v_ev2_id      UUID;
  v_ev3_id      UUID;
  v_ev4_id      UUID;
BEGIN
  -- Projeto principal
  INSERT INTO projects (
    owner_id, title, subtitle, description, category, project_type,
    cover_emoji, cover_gradient, genre, language, total_chapters_planned, target_word_count
  ) VALUES (
    p_user_id,
    'A Coroa Despedaçada',
    'A saga das três linhagens',
    'Uma jovem maga descobre ser herdeira de uma linhagem considerada extinta, enquanto seu rival de academia manobra para dominar a Coroa que mantém o reino unido.',
    'Livros', 'book',
    '👑', 'linear-gradient(135deg,#4a1942,#7b2f78)',
    'Fantasia', 'pt-BR', 36, 120000
  ) RETURNING id INTO v_project_id;

  -- Atos
  INSERT INTO acts (project_id, title, sort_order)
    VALUES (v_project_id, 'Ato I — O Despertar', 0) RETURNING id INTO v_act1_id;
  INSERT INTO acts (project_id, title, sort_order)
    VALUES (v_project_id, 'Ato II — A Fratura', 1) RETURNING id INTO v_act2_id;
  INSERT INTO acts (project_id, title, sort_order)
    VALUES (v_project_id, 'Ato III — O Acerto de Contas', 2) RETURNING id INTO v_act3_id;

  -- Personagens
  INSERT INTO characters (
    project_id, name, short_name, initials, role, role_type, is_pov,
    status, age, nationality, occupation, languages,
    description, personality, goals, fears, virtues, flaws,
    avatar_color, sort_order
  ) VALUES (
    v_project_id, 'Elara Vayne', 'Elara', 'EL', 'Protagonista', 'protagonist', TRUE,
    'alive', 23, 'Ashevani', 'Aprendiz de Maga da Corte', ARRAY['Comum','Rúnico Antigo','Sylvan'],
    'Elara Vayne é uma jovem maga de talento excepcional, sobrecarregada por uma profecia que ela jamais pediu. Seus cabelos prateados e olhos violeta a marcam como a última herdeira da linhagem Vayne — uma linhagem considerada extinta há um século.',
    'Teimosa, curiosa e ferozmente leal àqueles em quem confia. Ela esconde sua vulnerabilidade por trás de uma ironia afiada.',
    'Desvendar sua linhagem, impedir Kael de tomar a Coroa',
    'Perder o controle de seu poder · Tornar-se como Kael',
    'Leal · Corajosa · Empática · Mente ágil',
    'Impulsiva · Desconfiada · Auto-sacrifício excessivo',
    'linear-gradient(135deg,#6B5FE4,#9B8FF8)', 0
  ) RETURNING id INTO v_elara_id;

  INSERT INTO characters (
    project_id, name, short_name, initials, role, role_type, status, avatar_color, sort_order
  ) VALUES (
    v_project_id, 'Kael Dorn', 'Kael', 'KA', 'Antagonista', 'antagonist',
    'alive', 'linear-gradient(135deg,#C84B31,#E07B54)', 1
  ) RETURNING id INTO v_kael_id;

  INSERT INTO characters (
    project_id, name, short_name, initials, role, role_type, status, avatar_color, sort_order
  ) VALUES (
    v_project_id, 'Syra do Vale', 'Syra', 'SY', 'Mentora', 'supporting',
    'alive', 'linear-gradient(135deg,#1D7A4A,#35A96B)', 2
  ) RETURNING id INTO v_syra_id;

  INSERT INTO characters (
    project_id, name, short_name, initials, role, role_type, status, avatar_color, sort_order
  ) VALUES (
    v_project_id, 'Mira Sol', 'Mira', 'MI', 'Aliada · Interesse amoroso', 'supporting',
    'alive', 'linear-gradient(135deg,#7B4FA0,#AF74D6)', 3
  ) RETURNING id INTO v_mira_id;

  INSERT INTO characters (
    project_id, name, short_name, initials, role, role_type, status, avatar_color, sort_order
  ) VALUES (
    v_project_id, 'Ronan Ash', 'Ronan', 'RO', 'Guarda leal', 'supporting',
    'unknown', 'linear-gradient(135deg,#444,#777)', 4
  ) RETURNING id INTO v_ronan_id;

  -- Arcos dos personagens (Elara)
  INSERT INTO character_arc_stages (character_id, act_id, stage_label, description, status, accent_color, sort_order)
  VALUES
    (v_elara_id, v_act1_id, 'Ato I', 'Descoberta da linhagem Vayne. Negação e fuga. Formação do grupo de exilados.', 'written', '#6B5FE4', 0),
    (v_elara_id, v_act2_id, 'Ato II', 'Confronto com o passado. Desenvolvimento do poder. Traição inesperada. Crise de identidade.', 'in_progress', '#E07B54', 1),
    (v_elara_id, v_act3_id, 'Ato III (não escrito)', 'Confronto final. Escolha impossível. Desfecho da linhagem Vayne.', 'planned', '#35A96B', 2);

  -- Relacionamentos
  INSERT INTO character_relationships (
    project_id, character_a_id, character_b_id,
    relationship_type, relationship_label, description, sentiment, style_color
  ) VALUES
    (v_project_id, v_elara_id, v_kael_id, 'Rivais', '— Rivais —',
     'Ex-colegas na Academia, agora em lados opostos da guerra pela Coroa. Uma compreensão mútua que beira o respeito, por baixo da inimizade.',
     'negative', '#C84B31'),
    (v_project_id, v_elara_id, v_mira_id, 'Romance', '— Amor —',
     'Um vínculo construído durante o exílio, complicado pelos segredos de Mira.',
     'positive', '#9B8FF8'),
    (v_project_id, v_elara_id, v_syra_id, 'Mentora', '— Mentora —',
     'Syra guia Elara desde a infância, mas sua verdadeira lealdade permanece obscura.',
     'complex', '#35A96B');

  -- Locais
  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'Ashenveil', 'A capital murada do Reino Ashevani, sede do Conselho dos Magos e lar do Cofre da Coroa.',
          '🏰', 'linear-gradient(135deg,#1a1a2e,#16213e)', 0)
  RETURNING id INTO v_ashenveil;

  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'A Floresta Sussurrante', 'Um bosque ancestral que se diz ter consciência. As árvores se lembram de tudo que passa sob seus galhos.',
          '🌲', 'linear-gradient(135deg,#0d4f3c,#1a7a5a)', 1)
  RETURNING id INTO v_forest_id;

  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'Academia dos Magos', 'A instituição de aprendizado mágico mais antiga do continente. Onde Elara se formou antes do exílio.',
          '🔮', 'linear-gradient(135deg,#4a1942,#7b2f78)', 2)
  RETURNING id INTO v_academy_id;

  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'Os Despojos de Ossos', 'Um vasto deserto que dizem ser os restos de um antigo campo de batalha.',
          '🏜️', 'linear-gradient(135deg,#3a2000,#7a4800)', 3);

  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'Porto de Velrath', 'Uma cidade comercial agitada na borda do reino. O grupo de exilados busca refúgio aqui após a fuga.',
          '⛵', 'linear-gradient(135deg,#001a3a,#003a70)', 4)
  RETURNING id INTO v_porto_id;

  INSERT INTO locations (project_id, name, description, thumb_emoji, thumb_gradient, sort_order)
  VALUES (v_project_id, 'O Cofre da Coroa', 'Escondido sob Ashenveil, este cofre guarda os fragmentos da Coroa Despedaçada.',
          '🌋', 'linear-gradient(135deg,#2a0a00,#5a1a00)', 5)
  RETURNING id INTO v_cofre_id;

  -- Capítulos
  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, location_id, sort_order, content)
  VALUES (v_project_id, v_act2_id, 24, 'Os Portões de Ashenveil', 3120, 'draft', v_ashenveil, 23,
    '<p>Os portões de ferro de Ashenveil erguiam-se diante de Elara como as mandíbulas de alguma besta ancestral, suas barras enferrujadas alcançando o céu como se implorassem aos céus por alívio. Ela os havia visto em sonhos — sempre fechados, sempre à espera.</p><p>Atrás dela, os remanescentes da companhia moviam-se em silêncio. Doze haviam partido do acampamento Vayne três dias antes. Oito permaneciam.</p><p>"As proteções ainda estão ativas," murmurou Syra, sua voz mal se distinguindo do vento. Ela pressionou dois dedos contra a barra central do portão, e uma luz violeta fraca pulsou para o exterior como um batimento cardíaco. "Alguém as esteve mantendo."</p><p>Elara sentiu o familiar magnetismo da magia antiga — a mesma ressonância que a havia conduzido por três reinos e duas cordilheiras. Parecia uma memória que ela jamais havia vivido.</p><p>"Kael," ela disse. Não era uma pergunta.</p><p>Syra retirou a mão. "Talvez. Ou algo mais antigo."</p>')
  RETURNING id INTO v_ch24_id;

  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order, content)
  VALUES (v_project_id, v_act2_id, 23, 'Sangue e Cerimônia', 4580, 'review', 22,
    '<p>A câmara do Conselho estava decorada para uma cerimônia que ninguém havia anunciado. Velas pretas nas bordas da mesa oval, flores de inverno que não floresciam nesta estação, e o cheiro pesado de incenso que Elara reconheceu como Resina de Memória — a substância usada em rituais de sangue.</p><p>Kael estava de costas para ela quando ela entrou, observando o grande mapa pendurado na parede norte. Ele não se voltou.</p><p>"Você chegou mais cedo do que esperava," disse ele. Sua voz era a mesma de sempre — calma, medida, quase entediada. "Ou mais tarde do que deveria."</p>')
  RETURNING id INTO v_ch23_id;

  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, location_id, sort_order, content)
  VALUES (v_project_id, v_act2_id, 22, 'Uma Carta Não Aberta', 2870, 'done', v_porto_id, 21,
    '<p>A carta estava na mesa de escrivaninha do quarto que Mira havia ocupado no Porto de Velrath. Não estava selada. Não havia nome no envelope.</p><p>Elara olhou para ela por um longo tempo sem tocá-la.</p><p>A letra da frente — um simples E, em cursivo elegante — era da mão de sua mãe. Ela reconhecia a escrita dos fragmentos que Syra lhe havia mostrado anos atrás. Fragmentos que lhe disseram pertencer a uma acadêmica morta, uma pesquisadora sem nome.</p><p>Não era uma acadêmica sem nome.</p>')
  RETURNING id INTO v_ch22_id;

  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order, content)
  VALUES (v_project_id, v_act1_id, 21, 'A Cachoeira Sussurrante', 3940, 'done', 20,
    '<p>O som da água os alcançou antes que o viram: um rugido baixo e constante que aumentava à medida que o caminho serpenteava entre os pinheiros. Ronan foi o primeiro a avançar, sua mão pousada no cabo da espada como sempre, mesmo quando não havia nada para temer.</p><p>A cachoeira despencava de um penhasco de pelo menos trinta metros, seus respingos alcançando o grupo como uma chuva fina e fria. Na base, uma piscina de água tão clara que parecia vidro.</p><p>"É aqui," disse Syra. "O lugar que procurávamos."</p>')
  RETURNING id INTO v_ch21_id;

  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order)
  VALUES (v_project_id, v_act1_id, 20, 'Sombras da Corte', 3210, 'done', 19) RETURNING id INTO v_ch20_id;
  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order)
  VALUES (v_project_id, v_act1_id, 19, 'O Juramento dos Magos', 2640, 'done', 18) RETURNING id INTO v_ch19_id;
  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order)
  VALUES (v_project_id, v_act1_id, 18, 'Brasas ao Anoitecer', 3880, 'done', 17) RETURNING id INTO v_ch18_id;
  INSERT INTO chapters (project_id, act_id, chapter_number, title, word_count, status, sort_order)
  VALUES (v_project_id, v_act1_id, 17, 'O Diário da Mãe', 2990, 'done', 16) RETURNING id INTO v_ch17_id;

  -- chapter_characters
  INSERT INTO chapter_characters VALUES
    (v_ch24_id, v_elara_id, TRUE),
    (v_ch24_id, v_kael_id,  FALSE),
    (v_ch23_id, v_kael_id,  FALSE),
    (v_ch23_id, v_elara_id, FALSE),
    (v_ch22_id, v_elara_id, TRUE),
    (v_ch22_id, v_mira_id,  FALSE),
    (v_ch21_id, v_elara_id, TRUE),
    (v_ch21_id, v_syra_id,  FALSE),
    (v_ch21_id, v_ronan_id, FALSE);

  -- location_characters
  INSERT INTO location_characters VALUES
    (v_ashenveil, v_elara_id),
    (v_ashenveil, v_kael_id),
    (v_ashenveil, v_syra_id),
    (v_ashenveil, v_ronan_id),
    (v_academy_id, v_elara_id),
    (v_academy_id, v_kael_id),
    (v_academy_id, v_syra_id),
    (v_forest_id, v_elara_id),
    (v_forest_id, v_mira_id),
    (v_porto_id, v_elara_id),
    (v_porto_id, v_mira_id),
    (v_porto_id, v_ronan_id);

  -- Ideias
  INSERT INTO ideas (project_id, content, category, emoji, sort_order) VALUES
    (v_project_id,
     'E se a Coroa Despedaçada só puder ser remontada por alguém que carrega as três linhagens — tornando Elara a única pessoa viva capaz disso?',
     'Reviravolta na trama', '💡', 0),
    (v_project_id,
     'A motivação de Kael não deveria ser poder. E se ele estiver tentando proteger alguém — e a Coroa for o único jeito?',
     'Personagem', '🎭', 1),
    (v_project_id,
     'Preciso de uma cena onde Elara vê as ruínas da antiga mansão Vayne.',
     'Cena', '🌍', 2),
    (v_project_id,
     'O sistema de magia: cada linhagem tem uma relação diferente com o tempo. Vayne percebe ecos de eventos passados. Dorn projeta futuros possíveis.',
     'Worldbuilding', '✨', 3),
    (v_project_id,
     'Deixar antecipado no Cap. 3 que Syra sabe mais sobre a paternidade de Elara do que deixa transparecer.',
     'Presságio', '🔗', 4);

  -- Eventos da timeline
  INSERT INTO timeline_events (project_id, chapter_id, title, description, in_world_date, sort_order, is_highlight)
  VALUES
    (v_project_id, v_ch24_id, 'Elara descobre o Selo Vayne',
     'Nas ruínas abaixo da Academia, Elara tropeça em um selo ancestral com o brasão de uma linhagem considerada extinta.',
     'Ano 1032, Primavera', 0, FALSE) RETURNING id INTO v_ev1_id;

  INSERT INTO timeline_events (project_id, title, description, in_world_date, sort_order, is_highlight)
  VALUES
    (v_project_id, 'Kael assume o Conselho dos Magos',
     'Por meio de traição e manobras políticas, Kael Dorn orquestra a prisão de três membros seniores do Conselho.',
     'Ano 1032, Fim da Primavera', 1, FALSE) RETURNING id INTO v_ev2_id;

  INSERT INTO timeline_events (project_id, title, description, in_world_date, sort_order, is_highlight)
  VALUES
    (v_project_id, 'O Exílio começa',
     'Elara é forçada a fugir da capital após Kael declará-la traidora da Coroa.',
     'Ano 1032, Verão', 2, FALSE) RETURNING id INTO v_ev3_id;

  INSERT INTO timeline_events (project_id, title, description, in_world_date, sort_order, is_highlight)
  VALUES
    (v_project_id, '⚡ Cerco de Ashenveil',
     'O confronto climático. Elara lidera um contra-ataque à cidade murada onde a Coroa Despedaçada está guardada.',
     'Ano 1032, Outono', 3, TRUE) RETURNING id INTO v_ev4_id;

  -- timeline_event_characters
  INSERT INTO timeline_event_characters VALUES
    (v_ev1_id, v_elara_id),
    (v_ev2_id, v_kael_id),
    (v_ev2_id, v_syra_id),
    (v_ev3_id, v_elara_id),
    (v_ev3_id, v_syra_id),
    (v_ev3_id, v_mira_id),
    (v_ev4_id, v_elara_id),
    (v_ev4_id, v_kael_id),
    (v_ev4_id, v_mira_id);

  -- Pesquisas
  INSERT INTO research (project_id, title, source_type, source_label, emoji, sort_order) VALUES
    (v_project_id, 'Sistemas de magia na fantasia', 'pdf', 'Artigo acadêmico', '📄', 0),
    (v_project_id, 'Arquitetura medieval europeia', 'link', 'Wikipedia', '🔗', 1),
    (v_project_id, 'Cerimônias de coroação históricas', 'video', 'YouTube', '🎥', 2),
    (v_project_id, 'Referências de palcos e cenários', 'image', 'Pinterest', '🖼️', 3),
    (v_project_id, 'Glossário de termos arcanos', 'note', 'Criado por você', '📝', 4);

  -- Categorias do universo
  INSERT INTO universe_categories (project_id, name, emoji, description, sort_order) VALUES
    (v_project_id, 'Sistema de Magia', '⚡', 'As três linhagens e sua relação com o tempo. A magia como memória ancestral.', 0),
    (v_project_id, 'Política e Organizações', '🏛️', 'O Conselho dos Magos, o Reino Ashevani, as facções em guerra.', 1),
    (v_project_id, 'Cronologia do Mundo', '📜', 'Os grandes eventos que moldaram o mundo antes da história começar.', 2),
    (v_project_id, 'Países e Territórios', '🌐', 'Mapa geográfico, culturas, idiomas e disputas territoriais.', 3),
    (v_project_id, 'Glossário', '📖', 'Termos, nomes e conceitos específicos deste universo.', 4),
    (v_project_id, 'Regras do Mundo', '⚔️', 'Leis da física, da magia, do que é possível e impossível.', 5);

  RETURN v_project_id;
END;
$$;
